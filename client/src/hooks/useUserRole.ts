/**
 * useUserRole
 * Detects the authenticated user's functional role by querying the backend.
 * Runs employer, school, and business profile queries in parallel.
 *
 * Returns:
 *  - isAdmin: user.role === "admin"
 *  - isEmployer: has an employer profile record
 *  - isSchool: email domain matches a registered + approved school
 *  - isBusiness: has a business/drop analytics profile (same as employer for now)
 *  - defaultPage: the page to route to after login
 *  - loading: true while any query is in flight
 */
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export function useUserRole() {
  const { user, isAuthenticated } = useAuth();

  const isAdmin = isAuthenticated && user?.role === "admin";

  // Only run these queries when authenticated
  const employerQuery = trpc.employer.profile.get.useQuery(undefined, {
    enabled: isAuthenticated && !isAdmin,
    retry: false,
  });

  const schoolQuery = trpc.school.auth.me.useQuery(undefined, {
    enabled: isAuthenticated && !isAdmin,
    retry: false,
  });

  const loading =
    (employerQuery.isLoading && isAuthenticated && !isAdmin) ||
    (schoolQuery.isLoading && isAuthenticated && !isAdmin);

  const isEmployer = !!employerQuery.data;
  const isSchool = !!schoolQuery.data;
  // Business dashboard access: users who have an employer profile with drop analytics
  // For now, isBusiness === isEmployer (same user type, different dashboard section)
  const isBusiness = isEmployer;

  // Determine the default post-login page
  let defaultPage = "dashboard";
  if (isAdmin) defaultPage = "admin-dashboard";
  else if (isSchool) defaultPage = "school-portal";
  else if (isEmployer) defaultPage = "employer";

  return {
    isAdmin,
    isEmployer,
    isSchool,
    isBusiness,
    defaultPage,
    loading,
  };
}
