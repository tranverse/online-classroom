import React from "react";
import Form from "@components/Form";
import InputField from "@components/Form/InputField";
import Heading from "@components/Heading";
import SubmitButton from "@components/Form/SubmitButton";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAppDispatch } from "../../store/hooks";
import { loginUser } from "../../store/userSlice";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const handleSubmit = async (data: { email: string; password: string }) => {
    try {
      const resultAction = await dispatch(loginUser(data));
      if (loginUser.fulfilled.match(resultAction)) {
        toast.success("Login successful");
        // resultAction.payload should be the user object
        const user =
          (resultAction.payload as any) ||
          JSON.parse(localStorage.getItem("user") || "null");
        const role = user?.role;
        if (role === "ADMIN") navigate("/admin");
        else if (role === "TEACHER") navigate("/teacher");
        else navigate("/student");
      } else {
        toast.error((resultAction.payload as string) || "Login failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Login error");
    }
  };

  return (
    <div className="flex justify-center items-center h-screen flex-col gap-10 bg-gradient-to-br from-[var(--secondary-color)]/10 to-[var(--primary-color)]/40">
      <div className="p-10 w-md flex flex-col gap-10 shadow-lg shadow-green-500/20 rounded-lg border bg-white border-green-200">
        <Heading
          className="text-3xl text-[var(--primary-color)]"
          name="Login"
        />
        <Form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-5">
            <InputField
              label="Email"
              name="email"
              type="email"
              placeholder="Enter your email"
            />
            <div>
              <InputField
                label="Password"
                name="password"
                type="password"
                placeholder="Enter your password"
              />
              <div className="text-right italic text-red-500 text-sm cursor-pointer hover:text-[var(--secondary-color)]">
                Forgot password?
              </div>
            </div>
            <SubmitButton name="Login" type="submit" />
          </div>
        </Form>
      </div>
    </div>
  );
};

export default Login;
