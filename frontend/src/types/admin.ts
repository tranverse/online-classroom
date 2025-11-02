export interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  status: "ACTIVE" | "INACTIVE" | "BLOCKED";
  createdAt: string;
}

export interface Classroom {
  id: string;
  name: string;
  teacher: User;
  studentCount: number;
  quantity?: number;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
}

export interface Session {
  id: string;
  classroomId: string;
  title: string;
  startTime: string;
  endTime: string;
  status: "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
}

export interface Attendance {
  id: string;
  sessionId: string;
  userId: string;
  userName: string;
  status: "PRESENT" | "ABSENT" | "SUSPICIOUS";
  verifiedAt: string;
  confidence: number;
}

export interface DashboardStats {
  totalClassrooms: number;
  totalUsers: number;
  attendanceStats: {
    total: number;
    present: number;
    suspicious: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
