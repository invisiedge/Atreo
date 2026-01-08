import { logger } from '../lib/logger';
import { apiClient, type Submission, type CreateSubmissionRequest } from './api';

export class SubmissionService {
  static async getSubmissions(): Promise<Submission[]> {
    try {
      return await apiClient.getSubmissions();
    } catch (error) {
      logger.error('Failed to fetch submissions:', error);
      throw error;
    }
  }

  static async createSubmission(data: CreateSubmissionRequest): Promise<Submission> {
    try {
      return await apiClient.createSubmission(data);
    } catch (error) {
      logger.error('Failed to create submission:', error);
      throw error;
    }
  }

  static async updateSubmissionStatus(
    id: string,
    status: 'approved' | 'rejected',
    reviewedBy: string,
    rejectionReason?: string
  ): Promise<Submission> {
    try {
      return await apiClient.updateSubmissionStatus(id, status, reviewedBy, rejectionReason);
    } catch (error) {
      logger.error('Failed to update submission status:', error);
      throw error;
    }
  }
}
