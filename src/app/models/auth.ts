export interface AuthUser {
  id: number;
  name: string;
  email: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  subscription?: AuthSubscription | null;
}

export interface AuthSubscription {
  id: number;
  status: string;
  statusLabel: string;
  total: string;
  period: string;
  nextPayment: string | null;
  endDate: string | null;
  paymentMethod: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface AuthAccountUpdate {
  displayName: string;
  email: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export interface AuthMessage {
  message: string;
}

export interface AuthResetValidation {
  valid: boolean;
}

export interface AuthCommentResponse {
  id: number;
  postId: number;
  parentId: number;
  authorId: number;
  authorName: string;
  avatarUrl: string;
  content: string;
  date: string;
  status: 'approved' | 'pending';
  message: string;
}

export interface AuthCommentLike {
  id: number;
  count: number;
  liked: boolean;
}

export interface AuthCommentLikesResponse {
  likes: AuthCommentLike[];
}
