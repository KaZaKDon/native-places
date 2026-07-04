export function filterReports(reports, status) {
    if (status === "all") {
        return reports;
    }

    return reports.filter((report) => report.status === status);
}