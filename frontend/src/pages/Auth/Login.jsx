import React from "react";
import Form from "@components/Form";
import InputField from "@components/Form/InputField";
import Heading from "@components/Heading";
import SubmitButton from "@components/Form/SubmitButton";
const Login = () => {
  const handleSubmit = (data, reset) => {
    
  };
  return (
    <div className="flex justify-center items-center h-screen flex-col gap-10 bg-gradient-to-br from-[var(--secondary-color)]/10 to-[var(--primary-color)]/40">
      <div className=" p-10 w-md  flex flex-col gap-10 shadow-lg  shadow-green-500/20 rounded-lg border bg-white border-green-200">
        <Heading
          className={"text-3xl text-[var(--primary-color)]"}
          name={"Login"}
        />
        <Form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-5 ">
            <InputField
              label="Email"
              name="email"
              type="email"
              placeholder="Enter your email"
            />
            <div>
              <InputField
                label="Password"
                name="email"
                type="email"
                placeholder="Enter your password"
              />
              <div className="text-right italic text-red-500 text-sm cursor-pointer hover:text-[var(--secondary-color)]">
                Forgot password?
              </div>
            </div>
            <SubmitButton name={"Login"} />
          </div>
        </Form>
      </div>
    </div>
  );
};

export default Login;
