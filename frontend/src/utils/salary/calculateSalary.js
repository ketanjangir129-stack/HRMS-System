import { toast } from "react-toastify"

export const calculateSalary = (
    earnings,
    deductions
)=>{
    //Sum all Earnings
    const grossSalary = Object.values(earnings).reduce(
        (total,value) =>
            total + (Number(value)|| 0 ),0
        
    )
    // sum all deductions
    const totalDeduction = Object.values(deductions).reduce(
        (total,value) =>
            total + (Number(value)|| 0 ),0
        
    )
    // calculate net salary 
    const netSalary = grossSalary - totalDeduction;
    return{
        grossSalary,
        totalDeduction,
        netSalary,
    };
};