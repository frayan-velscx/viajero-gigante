// =============================================
// CONFIGURACIÓN FIREBASE ADMIN SDK
// =============================================

const admin = require('firebase-admin');

const serviceAccount = {
    type: "service_account",
    project_id: "gigante-viajero-55fef",
    private_key_id: "b75d91fb3b9a8c55e818bfd718952250e18bf6e5",
    private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDfXLOohRtHBDPD\nUAGwJXevAnDXhPKOHLT8guzHhRiUW6Uh42YEqQ66JbItf8fymXX6sEJj1eHlQquM\n4JyiyVn0CjaeG4i1skct/SUR9p+B/vftAJFWZk5JYVLl2qRYld1EfkTGtg3VRri4\nfdf9ZOuh+oCHt4jpBDNNOGXTW0PPM4z73WPCHg7Z2saiBjqtrJ1QG4oxveNbCDOa\n7FIwjS9Hi85xc1SrdVxGSmL3jZ02qiNI3XAYLEY12XiOMdW7BoBPpugrgg8adclF\nbmYb+0GRXAlOcNsnUTnRFXPwp+znFW6VUvYNO4rbCB5BIAJVR778FXLHNGZ3038B\nqD1h0g/dAgMBAAECggEAJ4p35IaRxl/kUPheICJ13kWyl7iZntZOpOABji2N5R+X\nK1lf80XBTWtEcGENUrFfjR48VoOjvovvphwSJpA6DCVtt04dBLtXdfj5IcW0xZTP\nK4Xc9LxeMgfYXsf2rZb0KX6n6ryKVN307/YZMSq3OwDHVZ9ETanYchxgjEq9BZYg\nPnMztXnnsw+ziYuItOpBT8hb+Rf9rBDApQabbhYgkPTsXcsZFnwbdOGlzOT5Xqta\nRNQvjW9P3zqALl9i9XjzEA1BitgnGN+9HjjKQrdoPetxjYROopNdVXObuAE7YXdP\nIvdhR5O5GcZyU4NMcxnpjkz1T06GTiow3ujhTym3wQKBgQDvVLrfYrmDeTkNKWxJ\nUss863x0ZJs2/VZN4M0CcWrm6jfaNkrhX63El7b0+oE9sHLkkmKi4Fc1+WGCQC/k\nSpQlGLF0LdfW3nBztqVk8zMomKW/4IVgFsjAQo8c0ulSekhlaN7DrH35KNRGKj/x\nCfxG5YvTXb56sLmdWFIfj3aDwQKBgQDu6z9D3YXe5vP2ALNbWpr7bk9bO1wPZp3a\nA9wwVmGt7OG2jYeiFC++XP3N1zXzM26BE6RN3+jC4lxhz7D87tt0Q8Fe3zGIb9tM\nohEqQaPwOyzYmmbYqgFQU1zQhNHaPW7Oyv1XH6b/YP/7atZ4RtL0Q2K8L2pEk6N7\nZWQI+tHjHQKBgEuUHk9dBeiW54VYh3HAS545X1wCSWHcLtz5GMSkvHWfkXO/oXX6\nmQ10O7qxQQ8SIbY85Bk7b08EKd7QFk+pnY75dVCTCY45QJnKHAD9LDKtweoOJRBr\nIYpVeoxHrpb1NtePfomcd0uvsRlXTkn4NUrOQpHFENn95R/jPEvrKioBAoGBAOFc\ncU6YlAAPpas0Ofo/2tSz1pLdyRaV2uucnIPT10txl+7UTU3q8KYFnToeeDsxFlkW\np/L0899wGWgBupa6z7I5fxr4OQbTS+5bKQnM5NBjYQfnjH9uzNJx76iYwEG1lOHm\nw1T8/E8DtjH3Mto9JBtXvLh5mSmagaiRmOyHepdZAoGBAJffxCQc/e2yUtsdPu6f\nT93jMA0I6Fco20bA9ZhSLV/V7/voqENuVbO0nxawPPmDKtbTjaidv+EKSYkX7B7U\nSM8MjdgabMjqHZVUclx7P4pIqWHiZiVcVdubn29kbZmHitnnRnOdRoBee7vaAjix\nL7oHVBBLhJCZkUdnbWtaul6S\n-----END PRIVATE KEY-----\n",
    client_email: "firebase-adminsdk-fbsvc@gigante-viajero-55fef.iam.gserviceaccount.com",
    client_id: "115106375761120651300",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40gigante-viajero-55fef.iam.gserviceaccount.com"
};

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'gigante-viajero-55fef.appspot.com'
    });
}

module.exports = admin;