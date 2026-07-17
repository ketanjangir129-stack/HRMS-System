import { useState } from "react";
import BasicInfo from "./steps/BasicInfo"

function EmployeeOnboarding(){
    const [step , setStep] = useState(1);
    const[employee , setEmployee]= useState({
      employeeId: "",
    name: "",
    email: "",
    mobile: "",
    address: "",
  });
 return (
    <div className="max-w-6xl mx-auto p-6">

      <h1 className="text-3xl font-bold mb-8">
        Employee Onboarding
      </h1>

      {step === 1 && (
        <BasicInfo
          employee={employee}
          setEmployee={setEmployee}
          nextStep={() => setStep(2)}
        />
      )}

    </div>
  );
}

export default EmployeeOnboarding;