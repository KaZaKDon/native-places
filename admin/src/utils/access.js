export function canAccessByRole(allowedRoles, userRole) {
    if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
        return true;
    }

    return allowedRoles.includes(userRole);
}