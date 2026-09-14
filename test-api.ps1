cd C:\Users\REZY\OneDrive\Documents\Absenku\AbsenKu
$body = 'email=admin@sekolah.com&password=admin123'
$response = Invoke-RestMethod -Uri 'http://localhost:3001/api/auth/callback/credentials' -Method POST -ContentType 'application/x-www-form-urlencoded' -Body $body -SessionVariable session
$response