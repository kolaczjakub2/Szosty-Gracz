<?php
/**
 * Plugin Name: Szósty Gracz — Netlify Cache
 * Description: Czyści cache feedu i artykułów Netlify natychmiast po zmianie wpisu w WordPressie.
 * Version: 1.0.0
 * Author: Szósty Gracz
 */

if (!defined('ABSPATH')) {
    exit;
}
const SGNC_WEBHOOK_URL_OPTION = 'sgnc_webhook_url';
const SGNC_WEBHOOK_SECRET_OPTION = 'sgnc_webhook_secret';
const SGNC_DEFAULT_WEBHOOK_URL = 'https://szostygracz-nba.netlify.app/api/cache-purge';

/** @var array<int, true> */
$GLOBALS['sgnc_pending_post_ids'] = [];

function sgnc_queue_purge($post_id) {
    $post_id = (int) $post_id;
    if ($post_id < 1 || wp_is_post_revision($post_id) || wp_is_post_autosave($post_id)) {
        return;
    }

    $post = get_post($post_id);
    if (!$post || $post->post_type !== 'post') {
        return;
    }

    $GLOBALS['sgnc_pending_post_ids'][$post_id] = true;
}

add_action('save_post_post', 'sgnc_queue_purge', 20, 1);
add_action('trashed_post', 'sgnc_queue_purge', 20, 1);
add_action('untrashed_post', 'sgnc_queue_purge', 20, 1);
add_action('before_delete_post', 'sgnc_queue_purge', 20, 1);

add_action('shutdown', function () {
    $post_ids = array_keys($GLOBALS['sgnc_pending_post_ids']);
    if (!$post_ids) {
        return;
    }

    $webhook_url = get_option(SGNC_WEBHOOK_URL_OPTION, SGNC_DEFAULT_WEBHOOK_URL);
    $secret = get_option(SGNC_WEBHOOK_SECRET_OPTION, '');
    if (!$webhook_url || !$secret) {
        error_log('Szósty Gracz Netlify Cache: brak adresu webhooka lub sekretu.');
        return;
    }

    foreach ($post_ids as $post_id) {
        $response = wp_remote_post($webhook_url, [
            'timeout' => 8,
            'blocking' => true,
            'headers' => [
                'Content-Type' => 'application/json',
                'X-SG-Webhook-Secret' => $secret,
            ],
            'body' => wp_json_encode(['postId' => $post_id]),
        ]);

        if (is_wp_error($response) || wp_remote_retrieve_response_code($response) >= 300) {
            error_log('Szósty Gracz Netlify Cache: czyszczenie cache nie powiodło się dla wpisu ' . $post_id . '.');
        }
    }
});

add_action('admin_init', function () {
    register_setting('sgnc_settings', SGNC_WEBHOOK_URL_OPTION, [
        'type' => 'string',
        'sanitize_callback' => 'esc_url_raw',
        'default' => SGNC_DEFAULT_WEBHOOK_URL,
    ]);
    register_setting('sgnc_settings', SGNC_WEBHOOK_SECRET_OPTION, [
        'type' => 'string',
        'sanitize_callback' => 'sanitize_text_field',
        'default' => '',
    ]);
});

add_action('admin_menu', function () {
    add_options_page(
        'Szósty Gracz — cache Netlify',
        'Cache Netlify',
        'manage_options',
        'szostygracz-netlify-cache',
        'sgnc_render_settings_page'
    );
});

function sgnc_render_settings_page() {
    if (!current_user_can('manage_options')) {
        return;
    }
    ?>
    <div class="wrap">
        <h1>Szósty Gracz — cache Netlify</h1>
        <p>Po zapisaniu, opublikowaniu lub usunięciu wpisu wtyczka natychmiast czyści cache feedu i tego artykułu.</p>
        <form method="post" action="options.php">
            <?php settings_fields('sgnc_settings'); ?>
            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row"><label for="sgnc_webhook_url">Adres webhooka</label></th>
                    <td><input class="regular-text" id="sgnc_webhook_url" name="<?php echo esc_attr(SGNC_WEBHOOK_URL_OPTION); ?>" type="url" value="<?php echo esc_attr(get_option(SGNC_WEBHOOK_URL_OPTION, SGNC_DEFAULT_WEBHOOK_URL)); ?>"></td>
                </tr>
                <tr>
                    <th scope="row"><label for="sgnc_webhook_secret">Sekret webhooka</label></th>
                    <td><input class="regular-text" id="sgnc_webhook_secret" name="<?php echo esc_attr(SGNC_WEBHOOK_SECRET_OPTION); ?>" type="password" autocomplete="new-password" value="<?php echo esc_attr(get_option(SGNC_WEBHOOK_SECRET_OPTION, '')); ?>"></td>
                </tr>
            </table>
            <?php submit_button(); ?>
        </form>
    </div>
    <?php
}
