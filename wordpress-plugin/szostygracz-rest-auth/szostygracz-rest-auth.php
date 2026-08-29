<?php
/**
 * Plugin Name: Szósty Gracz REST Auth
 * Description: Bezpieczne logowanie i rejestracja dla nowej aplikacji Szóstego Gracza.
 * Version: 1.5.0
 */

defined('ABSPATH') || exit;

const SG_AUTH_NAMESPACE = 'szostygracz/v1';
const SG_AUTH_META_KEY = '_sg_rest_auth_tokens';
const SG_AUTH_AVATAR_META_KEY = '_sg_rest_auth_avatar_attachment';
const SG_AUTH_MAX_AVATAR_SIZE = 5242880;

add_filter('get_avatar_url', function ($url, $id_or_email, $args) {
    $user_id = 0;

    if ($id_or_email instanceof WP_User) {
        $user_id = (int) $id_or_email->ID;
    } elseif ($id_or_email instanceof WP_Comment) {
        $user_id = (int) $id_or_email->user_id;
        if (!$user_id && $id_or_email->comment_author_email) {
            $user = get_user_by('email', $id_or_email->comment_author_email);
            $user_id = $user ? (int) $user->ID : 0;
        }
    } elseif (is_numeric($id_or_email)) {
        $user_id = (int) $id_or_email;
    } elseif (is_object($id_or_email) && !empty($id_or_email->user_id)) {
        $user_id = (int) $id_or_email->user_id;
    } elseif (is_string($id_or_email) && is_email($id_or_email)) {
        $user = get_user_by('email', $id_or_email);
        $user_id = $user ? (int) $user->ID : 0;
    }

    if (!$user_id) return $url;
    $attachment_id = (int) get_user_meta($user_id, SG_AUTH_AVATAR_META_KEY, true);
    if (!$attachment_id) return $url;

    $size = isset($args['size']) ? max(24, min(512, (int) $args['size'])) : 96;
    return wp_get_attachment_image_url($attachment_id, [$size, $size]) ?: $url;
}, 10, 3);

add_action('rest_api_init', function () {
    register_rest_route(SG_AUTH_NAMESPACE, '/login', [
        'methods' => 'POST', 'callback' => 'sg_auth_login', 'permission_callback' => '__return_true',
    ]);
    register_rest_route(SG_AUTH_NAMESPACE, '/register', [
        'methods' => 'POST', 'callback' => 'sg_auth_register', 'permission_callback' => '__return_true',
    ]);
    register_rest_route(SG_AUTH_NAMESPACE, '/password/forgot', [
        'methods' => 'POST', 'callback' => 'sg_auth_forgot_password', 'permission_callback' => '__return_true',
    ]);
    register_rest_route(SG_AUTH_NAMESPACE, '/password/validate', [
        'methods' => 'POST', 'callback' => 'sg_auth_validate_reset_key', 'permission_callback' => '__return_true',
    ]);
    register_rest_route(SG_AUTH_NAMESPACE, '/password/reset', [
        'methods' => 'POST', 'callback' => 'sg_auth_reset_password', 'permission_callback' => '__return_true',
    ]);
    register_rest_route(SG_AUTH_NAMESPACE, '/me', [
        'methods' => 'GET', 'callback' => 'sg_auth_me', 'permission_callback' => 'sg_auth_require_user',
    ]);
    register_rest_route(SG_AUTH_NAMESPACE, '/me', [
        'methods' => 'POST', 'callback' => 'sg_auth_update_me', 'permission_callback' => 'sg_auth_require_user',
    ]);
    register_rest_route(SG_AUTH_NAMESPACE, '/me/avatar', [
        'methods' => 'POST', 'callback' => 'sg_auth_update_avatar', 'permission_callback' => 'sg_auth_require_user',
    ]);
    register_rest_route(SG_AUTH_NAMESPACE, '/logout', [
        'methods' => 'POST', 'callback' => 'sg_auth_logout', 'permission_callback' => 'sg_auth_require_user',
    ]);
    register_rest_route(SG_AUTH_NAMESPACE, '/comments', [
        'methods' => 'POST', 'callback' => 'sg_auth_create_comment', 'permission_callback' => 'sg_auth_require_user',
    ]);
    register_rest_route(SG_AUTH_NAMESPACE, '/comments/likes', [
        'methods' => 'GET', 'callback' => 'sg_auth_comment_likes', 'permission_callback' => 'sg_auth_require_user',
    ]);
    register_rest_route(SG_AUTH_NAMESPACE, '/comments/(?P<id>\d+)/like', [
        'methods' => 'POST', 'callback' => 'sg_auth_toggle_comment_like', 'permission_callback' => 'sg_auth_require_user',
    ]);
});

add_action('rest_api_init', function () {
    $origin = get_http_origin();
    $allowed = apply_filters('sg_auth_allowed_origins', [
        'http://localhost:4200',
        'http://127.0.0.1:4200',
    ]);
    if ($origin && in_array($origin, $allowed, true)) {
        header('Access-Control-Allow-Origin: ' . esc_url_raw($origin));
        header('Access-Control-Allow-Headers: Authorization, Content-Type');
        header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
        header('Vary: Origin');
    }
}, 15);

function sg_auth_login(WP_REST_Request $request) {
    $login = sanitize_text_field($request->get_param('login'));
    if (sg_auth_rate_limited('login', $login)) return new WP_Error('too_many_requests', 'Zbyt wiele prób. Spróbuj ponownie za chwilę.', ['status' => 429]);
    $password = (string) $request->get_param('password');
    $user = wp_authenticate($login, $password);
    if (is_wp_error($user)) return new WP_Error('invalid_credentials', 'Nieprawidłowa nazwa użytkownika, e-mail lub hasło.', ['status' => 401]);

    $secret = bin2hex(random_bytes(32));
    $raw_token = $user->ID . '.' . $secret;
    $tokens = array_filter((array) get_user_meta($user->ID, SG_AUTH_META_KEY, true), function ($expires) {
        return $expires > time();
    });
    $tokens[hash('sha256', $secret)] = time() + DAY_IN_SECONDS;
    update_user_meta($user->ID, SG_AUTH_META_KEY, $tokens);
    return ['token' => $raw_token, 'user' => sg_auth_user_payload($user)];
}

function sg_auth_register(WP_REST_Request $request) {
    $email = sanitize_email($request->get_param('email'));
    if (sg_auth_rate_limited('register', $email)) return new WP_Error('too_many_requests', 'Zbyt wiele prób. Spróbuj ponownie za chwilę.', ['status' => 429]);
    if (!is_email($email)) return new WP_Error('invalid_email', 'Podaj prawidłowy adres e-mail.', ['status' => 400]);
    if (email_exists($email)) return new WP_Error('email_exists', 'Konto z tym adresem już istnieje. Skorzystaj z odzyskiwania hasła.', ['status' => 409]);

    $base = sanitize_user(strstr($email, '@', true), true) ?: 'uzytkownik';
    $login = $base;
    for ($i = 1; username_exists($login); $i++) $login = $base . $i;
    $user_id = wp_create_user($login, wp_generate_password(32, true, true), $email);
    if (is_wp_error($user_id)) return $user_id;
    $user = get_user_by('id', $user_id);
    if (!$user || is_wp_error(sg_auth_send_password_email($user, true, $request))) {
        return new WP_Error('email_failed', 'Konto utworzono, ale nie udało się wysłać wiadomości. Skontaktuj się z administratorem.', ['status' => 500]);
    }
    return new WP_REST_Response(['message' => 'Konto zostało utworzone. Sprawdź e-mail i ustaw hasło.'], 201);
}

function sg_auth_frontend_url(WP_REST_Request $request = null) {
    $origin = $request ? $request->get_header('origin') : '';
    $allowed = apply_filters('sg_auth_allowed_origins', [
        'http://localhost:4200',
        'http://127.0.0.1:4200',
    ]);
    if ($origin && in_array($origin, $allowed, true)) return untrailingslashit(esc_url_raw($origin));
    if (defined('SG_AUTH_FRONTEND_URL') && SG_AUTH_FRONTEND_URL) return untrailingslashit(esc_url_raw(SG_AUTH_FRONTEND_URL));
    return untrailingslashit((string) apply_filters('sg_auth_frontend_url', home_url('/')));
}

function sg_auth_reset_url($login, $key, WP_REST_Request $request = null) {
    return add_query_arg([
        'login' => $login,
        'key' => $key,
    ], sg_auth_frontend_url($request) . '/moje-konto/reset-password');
}

function sg_auth_send_password_email(WP_User $user, $new_account = false, WP_REST_Request $request = null) {
    $key = get_password_reset_key($user);
    if (is_wp_error($key)) return $key;
    $site_name = wp_specialchars_decode(get_option('blogname'), ENT_QUOTES);
    $subject = $new_account ? 'Ustaw hasło — ' . $site_name : 'Reset hasła — ' . $site_name;
    $intro = $new_account
        ? 'Twoje konto zostało utworzone. Ustaw hasło, aby się zalogować:'
        : 'Otrzymaliśmy prośbę o zmianę hasła. Ustaw nowe hasło tutaj:';
    $message = $intro . "\r\n\r\n" . sg_auth_reset_url($user->user_login, $key, $request) . "\r\n\r\n";
    $message .= 'Jeśli to nie Ty, zignoruj tę wiadomość.';
    return wp_mail($user->user_email, $subject, $message)
        ? true
        : new WP_Error('email_failed', 'Nie udało się wysłać wiadomości e-mail.', ['status' => 500]);
}

function sg_auth_forgot_password(WP_REST_Request $request) {
    $login = sanitize_text_field(trim((string) $request->get_param('login')));
    if ($login === '') return new WP_Error('missing_login', 'Podaj nazwę użytkownika lub adres e-mail.', ['status' => 400]);
    if (sg_auth_rate_limited('forgot_password', $login)) return new WP_Error('too_many_requests', 'Zbyt wiele prób. Spróbuj ponownie za chwilę.', ['status' => 429]);
    $user = is_email($login) ? get_user_by('email', $login) : get_user_by('login', $login);
    if ($user instanceof WP_User) sg_auth_send_password_email($user, false, $request);
    return ['message' => 'Jeśli konto istnieje, wysłaliśmy wiadomość z linkiem do ustawienia nowego hasła.'];
}

function sg_auth_validate_reset_key(WP_REST_Request $request) {
    $login = sanitize_user((string) $request->get_param('login'), true);
    $key = sanitize_text_field((string) $request->get_param('key'));
    $user = check_password_reset_key($key, $login);
    if (is_wp_error($user)) return new WP_Error('invalid_reset_key', 'Link jest nieprawidłowy lub wygasł. Poproś o nową wiadomość.', ['status' => 400]);
    return ['valid' => true];
}

function sg_auth_reset_password(WP_REST_Request $request) {
    $login = sanitize_user((string) $request->get_param('login'), true);
    $key = sanitize_text_field((string) $request->get_param('key'));
    $password = (string) $request->get_param('password');
    $confirm_password = (string) $request->get_param('confirmPassword');
    if ($password !== $confirm_password) return new WP_Error('password_mismatch', 'Hasła muszą być identyczne.', ['status' => 400]);
    if (function_exists('mb_strlen') ? mb_strlen($password) < 8 : strlen($password) < 8) {
        return new WP_Error('weak_password', 'Hasło musi mieć co najmniej 8 znaków.', ['status' => 400]);
    }
    $user = check_password_reset_key($key, $login);
    if (is_wp_error($user)) return new WP_Error('invalid_reset_key', 'Link jest nieprawidłowy lub wygasł. Poproś o nową wiadomość.', ['status' => 400]);
    reset_password($user, $password);
    delete_user_meta($user->ID, SG_AUTH_META_KEY);
    return ['message' => 'Hasło zostało ustawione. Możesz się teraz zalogować.'];
}

function sg_auth_require_user(WP_REST_Request $request) {
    $header = $request->get_header('authorization');
    if (!preg_match('/^Bearer\s+(\d+)\.([a-f0-9]{64})$/i', $header, $match)) return new WP_Error('not_authenticated', 'Zaloguj się ponownie.', ['status' => 401]);
    $user = get_user_by('id', (int) $match[1]);
    if (!$user) return new WP_Error('invalid_token', 'Sesja wygasła. Zaloguj się ponownie.', ['status' => 401]);
    $hash = hash('sha256', $match[2]);
    $tokens = (array) get_user_meta($user->ID, SG_AUTH_META_KEY, true);
    if (isset($tokens[$hash]) && $tokens[$hash] > time()) {
        $request->set_param('_sg_user', $user);
        $request->set_param('_sg_token_hash', $hash);
        return true;
    }
    return new WP_Error('invalid_token', 'Sesja wygasła. Zaloguj się ponownie.', ['status' => 401]);
}

function sg_auth_me(WP_REST_Request $request) { return sg_auth_user_payload($request->get_param('_sg_user')); }

function sg_auth_update_me(WP_REST_Request $request) {
    $user = $request->get_param('_sg_user');
    $display_name = sanitize_text_field(trim((string) $request->get_param('displayName')));
    $email = sanitize_email($request->get_param('email'));
    $current_password = (string) $request->get_param('currentPassword');
    $new_password = (string) $request->get_param('newPassword');
    $confirm_password = (string) $request->get_param('confirmPassword');

    if ($display_name === '') {
        return new WP_Error('invalid_display_name', 'Nazwa wyświetlana nie może być pusta.', ['status' => 400]);
    }
    if (!is_email($email)) {
        return new WP_Error('invalid_email', 'Podaj prawidłowy adres e-mail.', ['status' => 400]);
    }

    $existing_user = email_exists($email);
    if ($existing_user && (int) $existing_user !== (int) $user->ID) {
        return new WP_Error('email_exists', 'Konto z tym adresem e-mail już istnieje.', ['status' => 409]);
    }

    $update = [
        'ID' => $user->ID,
        'display_name' => $display_name,
        'user_email' => $email,
    ];

    if ($new_password !== '' || $confirm_password !== '' || $current_password !== '') {
        if ($current_password === '') {
            return new WP_Error('missing_current_password', 'Podaj obecne hasło, aby ustawić nowe.', ['status' => 400]);
        }
        if ($new_password === '' || $confirm_password === '') {
            return new WP_Error('missing_new_password', 'Podaj i potwierdź nowe hasło.', ['status' => 400]);
        }
        if ($new_password !== $confirm_password) {
            return new WP_Error('password_mismatch', 'Nowe hasła muszą być identyczne.', ['status' => 400]);
        }
        if (!wp_check_password($current_password, $user->user_pass, $user->ID)) {
            return new WP_Error('invalid_current_password', 'Obecne hasło jest nieprawidłowe.', ['status' => 403]);
        }
        if (function_exists('mb_strlen') ? mb_strlen($new_password) < 8 : strlen($new_password) < 8) {
            return new WP_Error('weak_password', 'Nowe hasło musi mieć co najmniej 8 znaków.', ['status' => 400]);
        }
        $update['user_pass'] = $new_password;
    }

    $result = wp_update_user($update);
    if (is_wp_error($result)) {
        return $result;
    }

    $updated_user = get_user_by('id', $user->ID);
    if (!$updated_user) {
        return new WP_Error('user_not_found', 'Nie udało się odczytać zaktualizowanego konta.', ['status' => 500]);
    }

    return sg_auth_user_payload($updated_user);
}

function sg_auth_update_avatar(WP_REST_Request $request) {
    if (empty($_FILES['avatar']) || !isset($_FILES['avatar']['error']) || (int) $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
        return new WP_Error('missing_avatar', 'Wybierz plik obrazu do przesłania.', ['status' => 400]);
    }

    $file = $_FILES['avatar'];
    if ((int) ($file['size'] ?? 0) > SG_AUTH_MAX_AVATAR_SIZE) {
        return new WP_Error('avatar_too_large', 'Avatar może mieć maksymalnie 5 MB.', ['status' => 413]);
    }
    $image_info = @getimagesize($file['tmp_name']);
    if (!$image_info) {
        return new WP_Error('invalid_avatar_type', 'Avatar musi być plikiem graficznym.', ['status' => 400]);
    }

    $allowed_image_types = array_filter([
        IMAGETYPE_JPEG,
        IMAGETYPE_PNG,
        IMAGETYPE_GIF,
        defined('IMAGETYPE_WEBP') ? IMAGETYPE_WEBP : null,
    ]);
    if (!in_array((int) $image_info[2], $allowed_image_types, true)) {
        return new WP_Error('invalid_avatar_type', 'Dozwolone formaty avatara to JPG, PNG, GIF i WEBP.', ['status' => 400]);
    }

    require_once ABSPATH . 'wp-admin/includes/file.php';
    require_once ABSPATH . 'wp-admin/includes/image.php';
    require_once ABSPATH . 'wp-admin/includes/media.php';

    $upload = wp_handle_upload($file, ['test_form' => false]);
    if (isset($upload['error'])) {
        return new WP_Error('avatar_upload_failed', $upload['error'], ['status' => 400]);
    }

    $user = $request->get_param('_sg_user');
    $file_path = $upload['file'];
    $file_type = $upload['type'];

    $attachment_id = wp_insert_attachment([
        'post_mime_type' => $file_type,
        'post_title' => sanitize_file_name(pathinfo($file_path, PATHINFO_FILENAME)),
        'post_content' => '',
        'post_status' => 'inherit',
        'post_author' => $user->ID,
    ], $file_path);

    if (is_wp_error($attachment_id)) {
        return $attachment_id;
    }

    $metadata = wp_generate_attachment_metadata($attachment_id, $file_path);
    wp_update_attachment_metadata($attachment_id, $metadata);
    update_user_meta($user->ID, SG_AUTH_AVATAR_META_KEY, $attachment_id);

    $updated_user = get_user_by('id', $user->ID);
    if (!$updated_user) {
        return new WP_Error('user_not_found', 'Nie udało się odczytać zaktualizowanego konta.', ['status' => 500]);
    }

    return sg_auth_user_payload($updated_user);
}

function sg_auth_logout(WP_REST_Request $request) {
    $user = $request->get_param('_sg_user');
    $tokens = (array) get_user_meta($user->ID, SG_AUTH_META_KEY, true);
    unset($tokens[$request->get_param('_sg_token_hash')]);
    update_user_meta($user->ID, SG_AUTH_META_KEY, $tokens);
    return ['message' => 'Wylogowano.'];
}

function sg_auth_create_comment(WP_REST_Request $request) {
    $user = $request->get_param('_sg_user');
    $post_id = absint($request->get_param('postId'));
    $parent_id = absint($request->get_param('parentId'));
    $content = trim((string) $request->get_param('content'));

    if (sg_auth_comment_rate_limited($user->ID)) {
        return new WP_Error('too_many_comments', 'Dodajesz komentarze zbyt szybko. Spróbuj ponownie za minutę.', ['status' => 429]);
    }

    $post = get_post($post_id);
    if (!$post || $post->post_status !== 'publish' || !post_type_supports($post->post_type, 'comments')) {
        return new WP_Error('invalid_post', 'Nie znaleziono wpisu, który można komentować.', ['status' => 404]);
    }
    if (!comments_open($post_id)) {
        return new WP_Error('comments_closed', 'Komentarze pod tym wpisem są wyłączone.', ['status' => 403]);
    }
    if (post_password_required($post)) {
        return new WP_Error('post_password_required', 'Ten wpis jest chroniony hasłem.', ['status' => 403]);
    }
    if ($content === '') {
        return new WP_Error('empty_comment', 'Treść komentarza nie może być pusta.', ['status' => 400]);
    }
    if (function_exists('mb_strlen') ? mb_strlen($content) > 5000 : strlen($content) > 5000) {
        return new WP_Error('comment_too_long', 'Komentarz może mieć maksymalnie 5000 znaków.', ['status' => 400]);
    }

    if ($parent_id) {
        $parent = get_comment($parent_id);
        if (!$parent || (int) $parent->comment_post_ID !== $post_id || $parent->comment_approved === 'trash') {
            return new WP_Error('invalid_parent', 'Komentarz, na który odpowiadasz, nie istnieje.', ['status' => 400]);
        }
    }

    $comment_id = wp_new_comment([
        'comment_post_ID' => $post_id,
        'comment_parent' => $parent_id,
        'comment_content' => $content,
        'comment_type' => '',
        'comment_author' => $user->display_name ?: $user->user_login,
        'comment_author_email' => $user->user_email,
        'comment_author_url' => $user->user_url,
        'user_id' => $user->ID,
    ], true);

    if (is_wp_error($comment_id)) return $comment_id;
    if (!$comment_id) return new WP_Error('comment_failed', 'Nie udało się dodać komentarza.', ['status' => 500]);

    $comment = get_comment($comment_id);
    $approved = (string) $comment->comment_approved === '1';

    return new WP_REST_Response([
        'id' => (int) $comment->comment_ID,
        'postId' => (int) $comment->comment_post_ID,
        'parentId' => (int) $comment->comment_parent,
        'authorId' => (int) $comment->user_id,
        'authorName' => $comment->comment_author,
        'avatarUrl' => get_avatar_url($user->ID, ['size' => 96]),
        'content' => apply_filters('comment_text', $comment->comment_content, $comment),
        'date' => mysql_to_rfc3339($comment->comment_date),
        'status' => $approved ? 'approved' : 'pending',
        'message' => $approved
            ? 'Komentarz został dodany.'
            : 'Komentarz został wysłany i czeka na moderację.',
    ], 201);
}

function sg_auth_comment_likes(WP_REST_Request $request) {
    $user = $request->get_param('_sg_user');
    $ids = array_values(array_unique(array_filter(array_map('absint', explode(',', (string) $request->get_param('ids'))))));
    $ids = array_slice($ids, 0, 100);
    $likes = [];

    foreach ($ids as $comment_id) {
        if (!get_comment($comment_id)) continue;
        $liked_users = array_map('absint', (array) get_comment_meta($comment_id, '_sg_liked_user_ids', true));
        $likes[] = [
            'id' => $comment_id,
            'count' => max(0, (int) get_comment_meta($comment_id, 'cld_like_count', true)),
            'liked' => in_array((int) $user->ID, $liked_users, true),
        ];
    }

    return ['likes' => $likes];
}

function sg_auth_toggle_comment_like(WP_REST_Request $request) {
    $user = $request->get_param('_sg_user');
    $comment_id = absint($request->get_param('id'));
    $comment = get_comment($comment_id);

    if (!$comment || (string) $comment->comment_approved !== '1') {
        return new WP_Error('invalid_comment', 'Komentarz nie istnieje.', ['status' => 404]);
    }

    $liked_users = array_values(array_unique(array_map('absint', (array) get_comment_meta($comment_id, '_sg_liked_user_ids', true))));
    $user_id = (int) $user->ID;
    $count = max(0, (int) get_comment_meta($comment_id, 'cld_like_count', true));
    $index = array_search($user_id, $liked_users, true);

    if ($index === false) {
        $liked_users[] = $user_id;
        $count++;
        $liked = true;
    } else {
        unset($liked_users[$index]);
        $liked_users = array_values($liked_users);
        $count = max(0, $count - 1);
        $liked = false;
    }

    update_comment_meta($comment_id, '_sg_liked_user_ids', $liked_users);
    update_comment_meta($comment_id, 'cld_like_count', $count);

    return ['id' => $comment_id, 'count' => $count, 'liked' => $liked];
}

function sg_auth_user_payload(WP_User $user) {
    $display_name = $user->display_name ?: $user->user_login;
    $avatar_attachment_id = (int) get_user_meta($user->ID, SG_AUTH_AVATAR_META_KEY, true);
    $avatar_url = $avatar_attachment_id ? wp_get_attachment_image_url($avatar_attachment_id, 'full') : false;

    return [
        'id' => $user->ID,
        'name' => $display_name,
        'firstName' => $user->first_name ?: '',
        'lastName' => $user->last_name ?: '',
        'email' => $user->user_email,
        'avatarUrl' => $avatar_url ?: get_avatar_url($user->ID, ['size' => 256]),
        'subscription' => sg_auth_subscription_payload($user->ID),
    ];
}

function sg_auth_subscription_payload($user_id) {
    if (!function_exists('wcs_get_users_subscriptions')) return null;

    $subscriptions = wcs_get_users_subscriptions($user_id);
    if (!$subscriptions) return null;

    $priority = ['active' => 0, 'pending-cancel' => 1, 'on-hold' => 2, 'pending' => 3, 'expired' => 4, 'cancelled' => 5];
    uasort($subscriptions, function ($a, $b) use ($priority) {
        return ($priority[$a->get_status()] ?? 99) <=> ($priority[$b->get_status()] ?? 99);
    });

    $subscription = reset($subscriptions);
    $period_labels = ['day' => 'dzień', 'week' => 'tydzień', 'month' => 'miesiąc', 'year' => 'rok'];
    $status = $subscription->get_status();

    return [
        'id' => $subscription->get_id(),
        'status' => $status,
        'statusLabel' => function_exists('wcs_get_subscription_status_name')
            ? wcs_get_subscription_status_name($status)
            : ucfirst($status),
        'total' => html_entity_decode(wp_strip_all_tags($subscription->get_formatted_order_total()), ENT_QUOTES, 'UTF-8'),
        'period' => $period_labels[$subscription->get_billing_period()] ?? $subscription->get_billing_period(),
        'nextPayment' => $subscription->get_date('next_payment') ?: null,
        'endDate' => $subscription->get_date('end') ?: null,
        'paymentMethod' => $subscription->get_payment_method_title(),
    ];
}
function sg_auth_rate_limited($action, $identifier = '') {
    $ip = sanitize_text_field($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $key = 'sg_auth_' . md5($action . '|' . $ip . '|' . strtolower((string) $identifier));
    $count = (int) get_transient($key);
    set_transient($key, $count + 1, 10 * MINUTE_IN_SECONDS);
    return $count >= 9;
}

function sg_auth_comment_rate_limited($user_id) {
    $ip = sanitize_text_field($_SERVER['REMOTE_ADDR'] ?? 'unknown');
    $key = 'sg_comment_' . md5($user_id . '|' . $ip);
    $count = (int) get_transient($key);
    set_transient($key, $count + 1, MINUTE_IN_SECONDS);
    return $count >= 4;
}
