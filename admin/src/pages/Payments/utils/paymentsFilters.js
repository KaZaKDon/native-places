export function filterPayments(payments, status) {
    if (status === "all") {
        return payments;
    }

    return payments.filter((payment) => payment.status === status);
}