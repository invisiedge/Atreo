/**
 * Employee API
 * Handles employee-related API calls
 */

import type { Employee, CreateEmployeeRequest } from '@/types';
import { API_ENDPOINTS } from '@/constants';
import { BaseApiClient } from './client';

export class EmployeeApi extends BaseApiClient {
  async getEmployees(): Promise<Employee[]> {
    return this.request<Employee[]>(API_ENDPOINTS.EMPLOYEES.BASE);
  }

  async createEmployee(data: CreateEmployeeRequest): Promise<Employee> {
    return this.request<Employee>(API_ENDPOINTS.EMPLOYEES.BASE, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEmployee(id: string, data: Partial<Employee>): Promise<Employee> {
    return this.request<Employee>(API_ENDPOINTS.EMPLOYEES.BY_ID(id), {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteEmployee(id: string): Promise<void> {
    return this.request<void>(API_ENDPOINTS.EMPLOYEES.BY_ID(id), {
      method: 'DELETE',
    });
  }

  async getEmployeeByEmployeeId(employeeId: string): Promise<Employee> {
    const employees = await this.getEmployees();
    const employee = employees.find(emp => emp.employeeId === employeeId);
    if (!employee) {
      throw new Error('Employee not found');
    }
    return employee;
  }
}
