import { logger } from '../lib/logger';
import { apiClient, type Employee, type CreateEmployeeRequest } from './api';

export class EmployeeService {
  static async getEmployees(): Promise<Employee[]> {
    try {
      return await apiClient.getEmployees();
    } catch (error) {
      logger.error('Failed to fetch employees:', error);
      throw error;
    }
  }

  static async createEmployee(data: CreateEmployeeRequest): Promise<Employee> {
    try {
      return await apiClient.createEmployee(data);
    } catch (error) {
      logger.error('Failed to create employee:', error);
      throw error;
    }
  }

  static async updateEmployee(id: string, data: Partial<Employee>): Promise<Employee> {
    try {
      return await apiClient.updateEmployee(id, data);
    } catch (error) {
      logger.error('Failed to update employee:', error);
      throw error;
    }
  }

  static async deleteEmployee(id: string): Promise<void> {
    try {
      return await apiClient.deleteEmployee(id);
    } catch (error) {
      logger.error('Failed to delete employee:', error);
      throw error;
    }
  }
}
