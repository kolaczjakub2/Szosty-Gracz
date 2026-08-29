# Integracja kont WordPress

Plugin obsługuje logowanie, rejestrację, lokalny reset hasła, edycję danych i hasła, avatary, komentarze, odpowiedzi oraz polubienia komentarzy.

1. W panelu WordPress wybierz **Wtyczki → Dodaj wtyczkę → Wyślij wtyczkę na serwer**, wgraj najnowszy plik ZIP i kliknij **Włącz wtyczkę**. Przy aktualizacji wybierz zastąpienie obecnej wersji.
2. Jeżeli aplikacja działa na innej domenie, dodaj do `wp-config.php` lub małej wtyczki MU filtr z jej adresem:

```php
add_filter('sg_auth_allowed_origins', fn () => [
    'https://TWOJA-DOMENA-APLIKACJI.pl',
    'http://localhost:4200',
]);

define('SG_AUTH_FRONTEND_URL', 'https://TWOJA-DOMENA-APLIKACJI.pl');
```

3. Otwórz `https://szostygracz.pl/wp-json/` i wyszukaj `szostygracz/v1`. Zapytanie `GET /szostygracz/v1/me` bez tokenu powinno zwrócić 401. `rest_no_route` oznacza, że plugin nie jest aktywny.

## Endpointy

- `POST /login` i `POST /register`
- `POST /password/forgot`, `/password/validate` i `/password/reset`
- `GET /me` — bieżący użytkownik
- `POST /me` — nazwa, e-mail i zmiana hasła
- `POST /me/avatar` — JPG, PNG, GIF lub WEBP do 5 MB
- `POST /logout`
- `POST /comments` — komentarz lub odpowiedź przez `parentId`
- `GET /comments/likes?ids=1,2,3`
- `POST /comments/{id}/like` — polubienie lub cofnięcie polubienia

Wszystkie endpointy poza logowaniem i rejestracją wymagają nagłówka `Authorization: Bearer TOKEN`. Tokeny są losowe, w WordPressie zapisywany jest tylko ich hash, a sesja wygasa po 24 godzinach.
