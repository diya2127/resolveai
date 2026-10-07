import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User as FirebaseUser,
  signOut,
} from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";

// Scopes required for Gmail integration
export const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/gmail.readonly");
provider.setCustomParameters({
  prompt: "consent",
});

const ACCESS_TOKEN_KEY = "resolveai_google_access_token";
const GOOGLE_USER_EMAIL_KEY = "resolveai_google_user_email";
let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener.
export const initAuth = (
  onAuthSuccess?: (user: FirebaseUser | any, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: FirebaseUser | null) => {
    if (user) {
      const token = await getAccessToken();
      if (token) {
        if (onAuthSuccess) onAuthSuccess(user, token);
      } else if (!isSigningIn) {
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      // Check if manual token exists in localStorage
      const manualToken = await getAccessToken();
      const savedEmail = localStorage.getItem(GOOGLE_USER_EMAIL_KEY);
      if (manualToken && savedEmail) {
        if (onAuthSuccess) {
          onAuthSuccess({ email: savedEmail, displayName: savedEmail.split("@")[0] }, manualToken);
        }
      } else {
        cachedAccessToken = null;
        try {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
        } catch (e) {}
        if (onAuthFailure) onAuthFailure();
      }
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: FirebaseUser; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error("Failed to get access token from Firebase Auth");
    }

    cachedAccessToken = credential.accessToken;
    try {
      localStorage.setItem(ACCESS_TOKEN_KEY, cachedAccessToken);
      if (result.user?.email) {
        localStorage.setItem(GOOGLE_USER_EMAIL_KEY, result.user.email);
      }
    } catch (e) {}

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error("Sign in error:", error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const saved = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (saved) {
      cachedAccessToken = saved;
      return saved;
    }
  } catch (e) {}
  return null;
};

export const setManualAccessToken = (token: string, email = "support@resolveai.in") => {
  cachedAccessToken = token.trim();
  try {
    localStorage.setItem(ACCESS_TOKEN_KEY, token.trim());
    localStorage.setItem(GOOGLE_USER_EMAIL_KEY, email.trim());
  } catch (e) {}
};

export const logoutGoogle = async () => {
  try {
    await signOut(auth);
  } catch (e) {}
  cachedAccessToken = null;
  try {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(GOOGLE_USER_EMAIL_KEY);
  } catch (e) {}
};
