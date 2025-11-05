import React, { useEffect, useState } from "react";
import StudentService from "../../services/student.service";

const ProfilePage: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  useEffect(() => {
    StudentService.getProfile().then(setProfile);
  }, []);

  if (!profile) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">My Profile</h1>
      <div className="bg-white p-4 rounded shadow">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-500">Name</div>
            <div className="font-medium">{profile.name}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Email</div>
            <div className="font-medium">{profile.email}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Role</div>
            <div className="font-medium">{profile.role}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Created At</div>
            <div className="font-medium">{profile.createdAt}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
