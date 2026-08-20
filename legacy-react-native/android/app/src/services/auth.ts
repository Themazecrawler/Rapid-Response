import AsyncStorage from '@react-native-async-storage/async-storage';
import { enhancedApi } from './api';

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    email: string;
    role: string;
  };
}

class AuthService {
  private async storeAuthData(response: AuthResponse) {
    await AsyncStorage.multiSet([
      ['userToken', response.token],
      ['userId', response.user.id.toString()],
      ['userRole', response.user.role],
    ]);
  }

  public async login(credentials: AuthCredentials): Promise<AuthResponse> {
    try {
      const response = await enhancedApi.post('/auth/login', credentials);
      await this.storeAuthData(response.data);
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  public async register(userData: AuthCredentials & { name: string }): Promise<AuthResponse> {
    try {
      const response = await enhancedApi.post('/auth/register', userData);
      await this.storeAuthData(response.data);
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  public async logout(): Promise<void> {
    try {
      await enhancedApi.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await AsyncStorage.multiRemove(['userToken', 'userId', 'userRole']);
    }
  }

  public async checkAuth(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return false;

      await enhancedApi.get('/auth/verify');
      return true;
    } catch (error) {
      await this.logout();
      return false;
    }
  }
}

export const authService = new AuthService();