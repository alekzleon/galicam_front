export function can(user, moduleName) {
  if (!moduleName) return true
  if (Array.isArray(moduleName)) {
    return moduleName.some((name) => can(user, name))
  }

  return Boolean(getUserModules(user).includes(moduleName))
}

export function getUserModules(user) {
  return user?.modules || user?.user?.modules || []
}

export function isInternalUser(user) {
  const nestedUser = user?.user || user

  if (typeof nestedUser?.is_internal === "boolean") return nestedUser.is_internal
  if (typeof user?.is_internal === "boolean") return user.is_internal

  return nestedUser?.role?.name !== "cliente" && Boolean(nestedUser?.role)
}
