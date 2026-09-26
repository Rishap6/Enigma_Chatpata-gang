import { apiClient } from './api';
import { AuthResponse, User } from '../types';

export const authService = {
  async register(email: string, password: string, full_name?: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', {
      email,
      password,
      full_name,
    });
    return response.data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  async demoLogin(user_type: 'demo' | 'other_user' = 'demo'): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>(`/auth/demo-login?user_type=${user_type}`);
    return response.data;
  },

  async getMe(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },
};
