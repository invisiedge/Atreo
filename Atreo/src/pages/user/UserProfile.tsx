import React, { useState, useEffect } from 'react';
import { FiUser, FiCreditCard, FiSave, FiEdit3, FiPhone } from 'react-icons/fi';
import { apiClient } from '../../services/api';
import type { UserProfile as UserProfileType, UpdateUserProfileRequest } from '../../services/api';
import { logger } from '../../lib/logger';
import { useAuth } from '../../context/AuthContext';

const UserProfile: React.FC = () => {
  const { setUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    position: '',
    phoneNumber: '',
    homeAddress: '',
    bankName: '',
    accountNumber: '',
    swiftCode: ''
  });
  const [originalData, setOriginalData] = useState({
    name: '',
    email: '',
    position: '',
    phoneNumber: '',
    homeAddress: '',
    bankName: '',
    accountNumber: '',
    swiftCode: ''
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const profile: UserProfileType = await apiClient.getUserProfile();
      
      const profileData = {
        name: profile.name || '',
        email: profile.email || '',
        position: profile.position || '',
        phoneNumber: profile.phone || '',
        homeAddress: profile.address || '',
        bankName: profile.bankName || '',
        accountNumber: profile.accountNumber || '',
        swiftCode: profile.swiftCode || ''
      };
      
      setFormData(profileData);
      setOriginalData(profileData);
    } catch (error) {
      logger.error('Failed to fetch profile:', error);
      setError('Failed to load profile data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      const updateData: UpdateUserProfileRequest = {
        phone: formData.phoneNumber,
        address: formData.homeAddress,
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        swiftCode: formData.swiftCode
      };

      const response = await apiClient.updateUserProfile(updateData);
      
      // Update global user context with new data
      if (response) {
        // Construct user object from profile response
        const updatedUser = {
          id: response.id,
          name: response.name,
          email: response.email,
          role: response.role,
          phone: response.phone,
          address: response.address,
          position: response.position,
          bankName: response.bankName,
          accountNumber: response.accountNumber,
          swiftCode: response.swiftCode
        };
        setUser(updatedUser as any);
      } else {
        // Fallback: fetch profile again if update response doesn't contain data
        const freshProfile = await apiClient.getUserProfile();
        // Construct user object from profile
        const updatedUser = {
          id: freshProfile.id,
          name: freshProfile.name,
          email: freshProfile.email,
          role: freshProfile.role,
          phone: freshProfile.phone,
          address: freshProfile.address,
          position: freshProfile.position,
          bankName: freshProfile.bankName,
          accountNumber: freshProfile.accountNumber,
          swiftCode: freshProfile.swiftCode
        };
        setUser(updatedUser as any);
      }
      
      // Update original data to reflect saved changes
      setOriginalData(formData);
      setIsEditing(false);
      setSuccessMessage('Profile updated successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      logger.error('Failed to save profile:', error);
      setError('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData(originalData);
    setIsEditing(false);
    setError(null);
    setSuccessMessage(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Profile Settings</h2>
          <p className="mt-2 text-gray-600">Manage your personal and banking information.</p>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <FiEdit3 className="h-4 w-4" />
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-card shadow rounded-lg overflow-hidden border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <FiUser className="h-5 w-5 text-muted-foreground mr-2" />
              <h3 className="text-lg font-semibold text-foreground">Personal Information</h3>
            </div>
          </div>
          
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                disabled={true}
                className="w-full px-3 py-2 border border-border bg-background rounded-md text-gray-600"
              />
              <p className="text-xs text-muted-foreground mt-1">Personal information cannot be edited</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                disabled={true}
                className="w-full px-3 py-2 border border-border bg-background rounded-md text-gray-600"
              />
              <p className="text-xs text-muted-foreground mt-1">Contact your administrator to change email</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Position
              </label>
              <input
                type="text"
                name="position"
                value={formData.position}
                disabled={true}
                className="w-full px-3 py-2 border border-border bg-background rounded-md text-gray-600"
              />
              <p className="text-xs text-muted-foreground mt-1">Position is managed by HR</p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-card shadow rounded-lg overflow-hidden border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <FiPhone className="h-5 w-5 text-muted-foreground mr-2" />
              <h3 className="text-lg font-semibold text-foreground">Contact Information</h3>
            </div>
          </div>
          
          <div className="px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50 dark:bg-gray-900'
                }`}
                placeholder="+1 (555) 123-4567"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Home Address
              </label>
              <input
                type="text"
                name="homeAddress"
                value={formData.homeAddress}
                onChange={handleInputChange}
                disabled={!isEditing}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50 dark:bg-gray-900'
                }`}
                placeholder="123 Main Street, City, State 12345"
              />
            </div>
          </div>
        </div>

        {/* Banking Information */}
        <div className="bg-card shadow rounded-lg overflow-hidden border border-border lg:col-span-2">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <FiCreditCard className="h-5 w-5 text-muted-foreground mr-2" />
              <h3 className="text-lg font-semibold text-foreground">Banking Information</h3>
            </div>
          </div>
          
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50 dark:bg-gray-900'
                  }`}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  name="accountNumber"
                  value={formData.accountNumber}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono ${
                    isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50 dark:bg-gray-900'
                  }`}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  SWIFT Code
                </label>
                <input
                  type="text"
                  name="swiftCode"
                  value={formData.swiftCode}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono ${
                    isEditing ? 'border-gray-300' : 'border-gray-200 bg-gray-50 dark:bg-gray-900'
                  }`}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      {isEditing && (
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-primary border border-transparent rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <FiSave className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-yellow-900 mb-2">Security Notice</h4>
        <p className="text-sm text-yellow-800">
          Your banking information is encrypted and stored securely. Only you and authorized administrators can view this information.
        </p>
      </div>
    </div>
  );
};

export default UserProfile;
