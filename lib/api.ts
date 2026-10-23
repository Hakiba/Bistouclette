import AuthCookie from "../utils/AuthCookie";
import UserCookie from "../utils/UserCookie";

/**
 * Client HTTP unique du front.
 *
 * Toutes les pages passent par ici : une seule base d'URL, un seul endroit
 * qui attache le jeton d'authentification et qui transforme une réponse
 * d'erreur du backend en `ApiError` exploitable dans l'interface.
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "/api";

export class ApiError extends Error {
  constructor(public status: number, message: string, public code?: string) {
    super(message);
    this.name = "ApiError";
  }

  /** Le jeton est absent, expiré ou révoqué : il faut se reconnecter. */
  get isAuthError() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  /** Attache le jeton. `required` rejette immédiatement s'il est absent. */
  auth?: "none" | "optional" | "required";
};

function authorizationHeader(): Record<string, string> {
  const token = AuthCookie.getToken();

  if (!token?.token) {
    return {};
  }

  return { Authorization: `${token.type || "Bearer"} ${token.token}` };
}

async function readPayload(response: Response): Promise<any> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = "none" } = options;
  const headers: Record<string, string> = {};

  if (auth !== "none") {
    const header = authorizationHeader();

    if (auth === "required" && !header.Authorization) {
      throw new ApiError(401, "Connecte-toi pour continuer.", "NOT_AUTHENTICATED");
    }

    Object.assign(headers, header);
  }

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  let response: Response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "Serveur injoignable. Réessaie dans un instant.", "NETWORK_ERROR");
  }

  const payload = await readPayload(response);

  if (!response.ok) {
    // Un jeton invalide ne sert plus à rien : on nettoie la session locale
    // pour éviter d'afficher un utilisateur connecté qui ne l'est plus.
    if (response.status === 401) {
      AuthCookie.clearToken();
      UserCookie.clear();
    }

    throw new ApiError(
      response.status,
      payload?.message || payload?.errors?.[0]?.message || "Une erreur est survenue.",
      payload?.code,
    );
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, auth: RequestOptions["auth"] = "none") => request<T>(path, { auth }),
  post: <T>(path: string, body?: unknown, auth: RequestOptions["auth"] = "required") =>
    request<T>(path, { method: "POST", body, auth }),
  put: <T>(path: string, body?: unknown, auth: RequestOptions["auth"] = "required") =>
    request<T>(path, { method: "PUT", body, auth }),
  delete: <T>(path: string, auth: RequestOptions["auth"] = "required") =>
    request<T>(path, { method: "DELETE", auth }),
};

/** Message affichable pour n'importe quelle erreur remontée par le client. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Une erreur inattendue est survenue.";
}
