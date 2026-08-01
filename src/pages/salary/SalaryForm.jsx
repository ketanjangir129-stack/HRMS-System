import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getEmployeeById } from "../../services/EmployeeService";
import { calculateSalary } from "../../utils/salary/calculateSalary"
import { set } from "firebase/database";
import { createSalary, getSalary, updateSalary } from "../../services/SalaryService";
import { toast } from "react-toastify";
function SalaryForm() {
    const { employeeId } = useParams();
    const [employee, setEmployee] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const companyCode =
        localStorage.getItem('companyCode');
    const [earnings, setEarnings] = useState({
        basic: "",
        hra: "",
        da: "",
        conveyance: "",
        medical: "",
        specialAllowance: "",
        bonus: "",
    });

    const [deductions, setDeductions] = useState({
        pf: "",
        esi: "",
        professionalTax: "",
        incomeTax: "",
        loan: "",
        other: "",
    });

    const [summary, setSummary] = useState({
        grossSalary: 0,
        totalDeduction: 0,
        netSalary: 0,
    });
    const [effectiveFrom, setEffectiveFrom] = useState("");
    const [status, setStatus] = useState("Active");
    const salary = {
        employeeId,
        earnings,
        deductions,
        grossSalary: summary.grossSalary,
        totalDeduction: summary.totalDeduction,
        netSalary: summary.netSalary,
        effectiveFrom,
        status,
    }

    const loadEmployee = async () => {
        try {
            const data = await getEmployeeById(
                companyCode,
                employeeId
            );
            setEmployee(data);
        } catch (error) {
            console.error(error);


        } finally {
            setLoading(false);
        }
    };
    const loadSalary = async () => {

        const salary = await getSalary(
            companyCode,
            employeeId
        );

        if (!salary) {

            return;

        }

        setIsEditMode(true);

        setEarnings(salary.earnings);

        setDeductions(salary.deductions);

        setSummary({

            grossSalary: salary.grossSalary,

            totalDeduction: salary.totalDeduction,

            netSalary: salary.netSalary,

        });

        setEffectiveFrom(
            salary.effectiveFrom
        );

        setStatus(
            salary.status
        );

    };

    const handleEarningChange = (e) => {

        const { name, value } = e.target;

        setEarnings((prev) => ({
            ...prev,
            [name]: value,
        }));

    };

    const handleDeductionChange = (e) => {

        const { name, value } = e.target;

        setDeductions((prev) => ({
            ...prev,
            [name]: value,
        }));

    };
    const handleSubmit = async () => {
        try {

            if (isEditMode) {

                await updateSalary(

                    companyCode,

                    employeeId,

                    {

                        earnings,

                        deductions,

                        grossSalary:
                            summary.grossSalary,

                        totalDeduction:
                            summary.totalDeduction,

                        netSalary:
                            summary.netSalary,

                        effectiveFrom,

                        status,

                    }

                );

                alert("Salary updated successfully.");

            }

            else {

                const result = await createSalary(

                    companyCode,

                    {

                        employeeId,

                        earnings,

                        deductions,

                        grossSalary:
                            summary.grossSalary,

                        totalDeduction:
                            summary.totalDeduction,

                        netSalary:
                            summary.netSalary,

                        effectiveFrom,

                        status,

                    }

                );

                alert(result.message);

            }
            navigate("/salarydashboard");
        }
        catch (error) {
            console.error(error)
        }
    }

    useEffect(() => {
        const salarySummary =
            calculateSalary(
                earnings, deductions
            );
        setSummary(salarySummary);
    }, [earnings, deductions]);

    useEffect(() => {
        const loadData = async () => {
            await loadEmployee();
            await loadSalary();
        };
        loadData();
    }, []);

    if (loading) {
        return (
            <div className="p-8">
                Loading Employee...
            </div>
        );
    };
    return (
        <div>

            <div className="bg-white rounded-xl shadow p-6 mb-6">
                <div title="Employee information">

                    <h2 className="text-lg font-semibold mb-4">
                        Employee Information
                    </h2>

                    <div className="grid grid-cols-2 gap-4">

                        <div className="flex gap-2 items-center">

                            <label className="text-sm text-gray-500">

                                Employee ID

                            </label>

                            <p className="font-medium">

                                {employee.employmentInfo.employeeId}

                            </p>

                        </div>

                        <div className="flex gap-2 items-center">

                            <label className="text-sm text-gray-500">

                                Employee Name

                            </label>

                            <p className="font-medium">

                                {employee.personalInfo.name}

                            </p>

                        </div>

                        <div className="flex gap-2 items-center">

                            <label className="text-sm text-gray-500">

                                Department

                            </label>

                            <p className="font-medium">

                                {employee.employmentInfo.department}

                            </p>

                        </div>

                        <div className="flex gap-2 items-center">

                            <label className="text-sm text-gray-500">

                                Designation

                            </label>

                            <p className="font-medium">

                                {employee.employmentInfo.designation}

                            </p>

                        </div>

                    </div>
                </div>
            </div>
            <div className="bg-white rounded-xl shadow p-6 mb-6">
                <div title="Earnings information">
                    <h2 className="text-lg font-semibold mb-5">
                        Earnings
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>

                            <label className="block text-sm font-medium mb-2">

                                Basic Salary

                            </label>

                            <input

                                type="number"

                                name="basic"

                                value={earnings.basic}

                                onChange={handleEarningChange}

                                className="w-full border rounded-lg px-4 py-2"

                            />

                        </div>
                        <div>

                            <label className="block text-sm font-medium mb-2">

                                HRA (House Rental Allowance)

                            </label>

                            <input

                                type="number"

                                name="hra"

                                value={earnings.hra}

                                onChange={handleEarningChange}

                                className="w-full border rounded-lg px-4 py-2"

                            />

                        </div>
                        <div>

                            <label className="block text-sm font-medium mb-2">

                                DA (Dearness Allowance)

                            </label>

                            <input

                                type="number"

                                name="da"

                                value={earnings.da}

                                onChange={handleEarningChange}

                                className="w-full border rounded-lg px-4 py-2"

                            />

                        </div>
                        <div>

                            <label className="block text-sm font-medium mb-2">

                                CONVEYANCE

                            </label>

                            <input

                                type="number"

                                name="conveyance"

                                value={earnings.conveyance}

                                onChange={handleEarningChange}

                                className="w-full border rounded-lg px-4 py-2"

                            />

                        </div>
                        <div>

                            <label className="block text-sm font-medium mb-2">

                                MEDICAL

                            </label>

                            <input

                                type="number"

                                name="medical"

                                value={earnings.medical}

                                onChange={handleEarningChange}

                                className="w-full border rounded-lg px-4 py-2"

                            />

                        </div>
                        <div>

                            <label className="block text-sm font-medium mb-2">

                                BONUS

                            </label>

                            <input

                                type="number"

                                name="bonus"

                                value={earnings.bonus}

                                onChange={handleEarningChange}

                                className="w-full border rounded-lg px-4 py-2"

                            />

                        </div>
                        <div>

                            <label className="block text-sm font-medium mb-2">

                                SPACIAL ALLOWANCE

                            </label>

                            <input

                                type="number"

                                name="specialAllowance"

                                value={earnings.specialAllowance}

                                onChange={handleEarningChange}

                                className="w-full border rounded-lg px-4 py-2"

                            />

                        </div>

                    </div>

                </div>
            </div>
            <div className="bg-white rounded-xl shadow p-6 mb-6">
                <div title="Deduction information">
                    <h2 className="text-lg font-semibold mb-5">
                        Deduction
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>

                            <label className="block text-sm font-medium mb-2">

                                PF (Provident Fund)

                            </label>

                            <input

                                type="number"

                                name="pf"

                                value={deductions.pf}

                                onChange={handleDeductionChange}

                                className="w-full border rounded-lg px-4 py-2"

                            />

                        </div>
                        <div>

                            <label className="block text-sm font-medium mb-2">

                                ESI (Employees State Insurance.)

                            </label>

                            <input

                                type="number"

                                name="esi"

                                value={deductions.esi}

                                onChange={handleDeductionChange}

                                className="w-full border rounded-lg px-4 py-2"

                            />

                        </div>
                        <div>

                            <label className="block text-sm font-medium mb-2">

                                PROFESSIONAL-TAX

                            </label>

                            <input

                                type="number"

                                name="professionalTax"

                                value={deductions.professionalTax}

                                onChange={handleDeductionChange}

                                className="w-full border rounded-lg px-4 py-2"

                            />

                        </div>
                        <div>

                            <label className="block text-sm font-medium mb-2">

                                INCOME-TAX

                            </label>

                            <input

                                type="number"

                                name="incomeTax"

                                value={deductions.incomeTax}

                                onChange={handleDeductionChange}

                                className="w-full border rounded-lg px-4 py-2"

                            />

                        </div>
                        <div>

                            <label className="block text-sm font-medium mb-2">

                                LOAN

                            </label>

                            <input

                                type="number"

                                name="loan"

                                value={deductions.loan}

                                onChange={handleDeductionChange}

                                className="w-full border rounded-lg px-4 py-2"

                            />

                        </div>
                        <div>

                            <label className="block text-sm font-medium mb-2">

                                OTHER

                            </label>

                            <input

                                type="number"

                                name="other"

                                value={deductions.other}

                                onChange={handleDeductionChange}

                                className="w-full border rounded-lg px-4 py-2"

                            />

                        </div>


                    </div>

                </div>
            </div>
            <div className="bg-white rounded-xl shadow p-6 mt-6">

                <h2 className="text-lg font-semibold mb-5">
                    Salary Summary
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    <div>

                        <p className="text-gray-500">

                            Gross Salary

                        </p>

                        <h3 className="text-2xl font-bold text-green-600">

                            ₹ {summary.grossSalary.toLocaleString()}

                        </h3>

                    </div>

                    <div>

                        <p className="text-gray-500">

                            Total Deduction

                        </p>

                        <h3 className="text-2xl font-bold text-red-600">

                            ₹ {summary.totalDeduction.toLocaleString()}

                        </h3>

                    </div>

                    <div>

                        <p className="text-gray-500">

                            Net Salary

                        </p>

                        <h3 className="text-2xl font-bold text-blue-600">

                            ₹ {summary.netSalary.toLocaleString()}

                        </h3>

                    </div>

                </div>

            </div>
            <div className="flex justify-end mt-8">

                <button

                    onClick={handleSubmit}

                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"

                >


                    {

                        isEditMode

                            ?

                            "Update Salary"

                            :

                            "Assign Salary"

                    }

                </button>

            </div>
        </div>


    )


}
export default SalaryForm;


