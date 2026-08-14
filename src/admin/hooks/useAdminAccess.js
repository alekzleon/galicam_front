import { can, getUserModules, isInternalUser } from "../../utils/adminAccess"

function useAdminAccess(user) {
  const modules = getUserModules(user)
  const hasModule = (moduleName) => can(user, moduleName)
  const isInternal = isInternalUser(user)

  return {
    modules,
    hasModule,
    isInternal,
  }
}

export default useAdminAccess
