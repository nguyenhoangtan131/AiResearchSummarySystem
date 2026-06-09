export interface AppUser {
  full_name: string;
  email: string;
  tier?: 'free' | 'tier 1' | 'admin';
}

const USER_STORAGE_KEY = 'user_info';

export function getStoredUser(): AppUser | null {
  const savedUser = localStorage.getItem(USER_STORAGE_KEY);

  if (!savedUser) {
    return null;
  }

  try {
    return JSON.parse(savedUser) as AppUser;
  } catch (error) {
    console.error('Không đọc được user_info đã lưu:', error);
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
}

export function saveStoredUser(user: AppUser): void {
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

export function clearStoredUser(): void {
  localStorage.removeItem(USER_STORAGE_KEY);
}
