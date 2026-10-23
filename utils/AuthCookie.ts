import Cookies from 'js-cookie';

interface UserToken {
    type: string;
    token: string;
    expires_at: string;
}

class AuthCookie {
    static getToken(): UserToken | null {
        const tokenString = Cookies.get("authToken");
        if (!tokenString) return null;

        try {
            return JSON.parse(tokenString) as UserToken;
        } catch {
            return null;
        }
    }

    static setToken(tokenData: UserToken): void {
        Cookies.set("authToken", JSON.stringify(tokenData), { expires: 7 }); // expire dans 7 jours
    }

    static clearToken(): void {
        Cookies.remove("authToken");
    }
}

export default AuthCookie;
