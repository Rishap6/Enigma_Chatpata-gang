import { apiClient } from './api';
import {
  FamilyMemberDetail,
  FamilyMemberSummary,
  MemberCreateBasic,
  MemberCreateFull,
  MemberUpdate,
  FutureEngineRequirements,
} from '../types';

export const memberService = {
  async listMembers(familyId: string): Promise<FamilyMemberSummary[]> {
    const response = await apiClient.get<FamilyMemberSummary[]>(`/families/${familyId}/members`);
    return response.data;
  },

  async createMember(familyId: string, memberData: MemberCreateBasic | MemberCreateFull): Promise<FamilyMemberDetail> {
    const response = await apiClient.post<FamilyMemberDetail>(`/families/${familyId}/members`, memberData);
    return response.data;
  },

  async getMember(memberId: string): Promise<FamilyMemberDetail> {
    const response = await apiClient.get<FamilyMemberDetail>(`/members/${memberId}`);
    return response.data;
  },

  async updateMember(memberId: string, memberData: MemberUpdate): Promise<FamilyMemberDetail> {
    const response = await apiClient.put<FamilyMemberDetail>(`/members/${memberId}`, memberData);
    return response.data;
  },

  async deleteMember(memberId: string): Promise<void> {
    await apiClient.delete(`/members/${memberId}`);
  },

  async getFutureEngineRequirements(memberId: string): Promise<FutureEngineRequirements> {
    const response = await apiClient.get<FutureEngineRequirements>(`/members/${memberId}/future-requirements`);
    return response.data;
  },
};
