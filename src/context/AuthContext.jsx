import {createContext,useContext,useEffect,useState,} from "react";
import {loginCompany,getCompanyByCode,} from "../services/companyService";

const AuthContext = createContext();

export const AuthProvider = ({children,}) => {
    
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const restoreSession = async () => {
                const companyCode = localStorage.getItem("companyCode");
                if (!companyCode) {
                    setLoading(false);
                    return;
                }

                const data = await getCompanyByCode(companyCode);
                setCompany(data);
                setLoading(false);
        };

        restoreSession();
    }, []);

    const login = async (
        companyCode,
        email,
        password
    ) => {
        const result =
            await loginCompany({
                companyCode,
                email,
                password,
            });

        if (result.success) {
            localStorage.setItem("companyCode",companyCode);
            setCompany(result.company);
        }

        return result;
    };

    const logout = () => {
        localStorage.removeItem("companyCode");
        setCompany(null);
    };

    return (
        <AuthContext.Provider
            value={{
                company,
                login,
                logout,
                loading,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);