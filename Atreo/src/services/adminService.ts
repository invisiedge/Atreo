import { logger } from '../lib/logger';
import { apiClient, type Admin } from './api';
import type { CreateAdminRequest, UpdateAdminRequest } from './api';

export class AdminService {
  static async getAdmins(): Promise<Admin[]> {
    try {
      return await apiClient.getAdmins();
    } catch (error) {
      logger.error('Failed to fetch admins:', error);
      throw error;
    }
  }

  static async createAdmin(data: CreateAdminRequest): Promise<Admin> {
    try {
      return await apiClient.createAdmin(data);
    } catch (error) {
      logger.error('Failed to create admin:', error);
      throw error;
    }
  }

  static async updateAdmin(id: string, data: UpdateAdminRequest): Promise<Admin> {
    try {
      return await apiClient.updateAdmin(id, data);
    } catch (error) {
      logger.error('Failed to update admin:', error);
      throw error;
    }
  }

  static async deleteAdmin(id: string): Promise<void> {
    try {
      return await apiClient.deleteAdmin(id);
    } catch (error) {
      logger.error('Failed to delete admin:', error);
      throw error;
    }
  }

  static async toggleAdminStatus(id: string, status: 'active' | 'inactive' | 'suspended'): Promise<Admin> {
    try {
      return await apiClient.updateAdminStatus(id, status);
    } catch (error) {
      logger.error('Failed to toggle admin status:', error);
      throw error;
    }
  }
}
