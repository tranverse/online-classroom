import React, { useState } from "react";
import { useForm } from "react-hook-form";
import StudentService from "../../services/student.service";
import { useToast } from "../../components/Toast";
import { Camera, Save, Upload } from "lucide-react";

const ProfileAttendance: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
    reset,
  } = useForm();
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();

  const onSubmitProfile = async (data: any) => {
    try {
      await StudentService.updateProfile(data);
      toast.show("Profile updated", "success");
      reset();
    } catch {
      toast.show("Failed to update profile", "error");
    }
  };

  const onPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoPreview(URL.createObjectURL(file));
  };

  const onSubmitPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    const input = document.getElementById("photo") as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return toast.show("Pick a photo first", "error");

    try {
      setUploading(true);
      await StudentService.uploadAttendancePhoto(file);
      toast.show("Attendance recorded", "success");
      setPhotoPreview(null);
      if (input) input.value = "";
    } catch {
      toast.show("Upload failed", "error");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-blue-800 mb-10">
          🎓 Student Portal
        </h1>

        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300">
            <h2 className="text-2xl font-semibold mb-6 text-blue-700 flex items-center gap-2">
              <Save size={22} />
              Update Profile
            </h2>
            <form onSubmit={handleSubmit(onSubmitProfile)} className="space-y-5">
              {["name", "email", "phone"].map((field) => (
                <div key={field}>
                  <label className="block text-gray-700 font-medium capitalize mb-1">
                    {field}
                  </label>
                  <input
                    {...register(field)}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    placeholder={`Enter your ${field}`}
                  />
                </div>
              ))}
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3 mt-4 rounded-xl text-white font-semibold shadow-md transition-all ${
                  isSubmitting
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg"
                }`}
              >
                {isSubmitting ? "Saving..." : "Save Profile"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileAttendance;
