import Cookies from 'js-cookie';

interface User {
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    age?: number;
    stravaId?: number;
    role?: "user" | "admin";
}

class UserCookie {
    static get(): User | null {
        const userString = Cookies.get("user");
        if (!userString) return null;

        try {
            return JSON.parse(userString) as User;
        } catch {
            return null;
        }
    }

    static set(userData: User): void {
        Cookies.set("user", JSON.stringify(userData));
    }

    static clear(): void {
        Cookies.remove("user");
    }
}

export default UserCookie;
