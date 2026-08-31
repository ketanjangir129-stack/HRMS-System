import * as XLSX from "xlsx";

/*
|--------------------------------------------------------------------------
| Export Invitation Links
|--------------------------------------------------------------------------
| A bulk run ends with a list of links somebody now has to send out. Keeping
| them only on screen would mean copying two hundred of them one at a time,
| so the whole run is written back out as a sheet — the failures included,
| because the rows that did not go through are the ones worth chasing.
|--------------------------------------------------------------------------
*/

const HEADINGS = [
    "Employee ID",
    "Employee Name",
    "Email",
    "Status",
    "Invitation Link",
    "Reason",
];

export const exportInvitationLinks = (
    results = [],
    fileName = "Onboarding-Invitation-Links.xlsx"
) => {

    const rows = results.map((result) => [
        result.employeeId || "",
        result.name || "",
        result.email || "",
        result.success ? "Invitation Sent" : "Failed",
        result.success ? result.invitationLink || "" : "",
        result.success ? "" : result.message || "",
    ]);

    const sheet = XLSX.utils.aoa_to_sheet([HEADINGS, ...rows]);

    sheet["!cols"] = [
        { wch: 16 },
        { wch: 24 },
        { wch: 30 },
        { wch: 18 },
        { wch: 60 },
        { wch: 36 },
    ];

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, sheet, "Invitations");

    const blob = new Blob(
        [XLSX.write(workbook, { bookType: "xlsx", type: "array" })],
        {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = fileName;
    link.click();

    URL.revokeObjectURL(url);

};

export default exportInvitationLinks;
