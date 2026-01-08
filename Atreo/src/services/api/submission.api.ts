/**
 * Submission API
 * Handles payroll submission-related API calls
 */

import type { Submission, CreateSubmissionRequest } from '@/types';
import { API_ENDPOINTS } from '@/constants';
import { BaseApiClient } from './client';

export class SubmissionApi extends BaseApiClient {
  async getSubmissions(): Promise<Submission[]> {
    const data = await this.request<any[]>(API_ENDPOINTS.SUBMISSIONS.BASE);
    // Transform _id to id for frontend compatibility
    return data.map(submission => ({
      ...submission,
      id: submission._id,
      submittedAt: submission.submittedAt,
      reviewedAt: submission.reviewedAt,
      reviewerName: submission.reviewerName || submission.reviewedBy?.name || 'Admin',
      rejectionReason: submission.rejectionReason,
    }));
  }

  async createSubmission(data: CreateSubmissionRequest): Promise<Submission> {
    return this.request<Submission>(API_ENDPOINTS.SUBMISSIONS.BASE, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateSubmissionStatus(
    id: string,
    status: 'approved' | 'rejected',
    reviewedBy: string,
    rejectionReason?: string
  ): Promise<Submission> {
    const requestBody: any = { status, reviewedBy };
    if (rejectionReason) {
      requestBody.rejectionReason = rejectionReason;
    }

    const data = await this.request<any>(`/submissions/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(requestBody),
    });
    // Transform _id to id for frontend compatibility
    return {
      ...data,
      id: data._id,
      submittedAt: data.submittedAt,
      reviewedAt: data.reviewedAt,
      reviewerName: data.reviewerName || data.reviewedBy?.name || 'Admin',
      rejectionReason: data.rejectionReason,
    };
  }

  async getMySubmissions(): Promise<Submission[]> {
    const data = await this.request<any[]>(API_ENDPOINTS.SUBMISSIONS.MY);
    return data.map(submission => ({
      ...submission,
      id: submission._id,
      submittedAt: submission.submittedAt,
      reviewedAt: submission.reviewedAt,
      reviewerName: submission.reviewerName || submission.reviewedBy?.name || 'Admin',
      rejectionReason: submission.rejectionReason,
    }));
  }
}
