import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { useAuth } from "../../../context/AuthContext"
import { trackMetaCompleteRegistration } from "../../../utils/metaPixel"
import "../LoginForm/loginform.css"

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  password_confirmation: "",
  terms_accepted: false,
}

function RegisterForm() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  function handleChange(event) {
    const { name, value, type, checked } = event.target

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  function validate() {
    const nextErrors = {}

    if (!form.name.trim()) nextErrors.name = "Ingresa tu nombre."
    if (!form.email.trim()) {
      nextErrors.email = "Ingresa tu correo."
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = "Ingresa un correo válido."
    }
    if (!form.password) {
      nextErrors.password = "La contraseña es obligatoria."
    } else if (form.password.length < 8) {
      nextErrors.password = "Debe tener al menos 8 caracteres."
    }
    if (form.password_confirmation !== form.password) {
      nextErrors.password_confirmation = "Las contraseñas no coinciden."
    }
    if (!form.terms_accepted) {
      nextErrors.terms_accepted = "Debes aceptar los términos y condiciones."
    }

    return nextErrors
  }

  function resolveRedirect(response) {
    if (response?.must_change_password || response?.user?.must_change_password) {
      return "/mi-cuenta/datos"
    }

    return response?.redirect_to || "/"
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const validationErrors = validate()
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) return

    try {
      setIsSubmitting(true)
      setErrors({})

      const response = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        password_confirmation: form.password_confirmation,
        device_name: "react-web",
      })

      trackMetaCompleteRegistration()
      toast.success(response?.message || "Registro exitoso.")
      navigate(resolveRedirect(response), { replace: true })
    } catch (error) {
      console.error("Error de registro:", error)
      const nextErrors = normalizeApiErrors(error)

      setErrors(nextErrors)
      toast.error(nextErrors.general || "No fue posible crear tu cuenta.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-form login-form--register">
      <form onSubmit={handleSubmit} noValidate className="login-form__form">
        {errors.general ? (
          <div className="login-form__alert">{errors.general}</div>
        ) : null}

        <div className={`login-form__field ${errors.name ? "is-error" : ""}`}>
          <label htmlFor="name" className="login-form__label">
            Nombre completo
          </label>
          <input
            id="name"
            name="name"
            type="text"
            className="login-form__input"
            placeholder="Cliente Prueba"
            value={form.name}
            onChange={handleChange}
            autoComplete="name"
          />
          {errors.name ? <span className="login-form__error">{errors.name}</span> : null}
        </div>

        <div className={`login-form__field ${errors.email ? "is-error" : ""}`}>
          <label htmlFor="email" className="login-form__label">
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="login-form__input"
            placeholder="cliente@email.com"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
          />
          {errors.email ? <span className="login-form__error">{errors.email}</span> : null}
        </div>

        <div className="login-form__grid">
          <div className={`login-form__field ${errors.password ? "is-error" : ""}`}>
            <label htmlFor="password" className="login-form__label">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="login-form__input"
              placeholder="Mínimo 8 caracteres"
              value={form.password}
              onChange={handleChange}
              autoComplete="new-password"
            />
            {errors.password ? <span className="login-form__error">{errors.password}</span> : null}
          </div>

          <div className={`login-form__field ${errors.password_confirmation ? "is-error" : ""}`}>
            <label htmlFor="password_confirmation" className="login-form__label">
              Confirmar contraseña
            </label>
            <input
              id="password_confirmation"
              name="password_confirmation"
              type="password"
              className="login-form__input"
              placeholder="Repite tu contraseña"
              value={form.password_confirmation}
              onChange={handleChange}
              autoComplete="new-password"
            />
            {errors.password_confirmation ? (
              <span className="login-form__error">{errors.password_confirmation}</span>
            ) : null}
          </div>
        </div>

        <div className="login-form__row login-form__row--terms">
          <label className={`login-form__check ${errors.terms_accepted ? "is-error" : ""}`}>
            <input
              type="checkbox"
              name="terms_accepted"
              checked={form.terms_accepted}
              onChange={handleChange}
            />
            <span>
              Acepto los{" "}
              <Link to="/terminos-y-condiciones" className="login-form__link">
                términos y condiciones
              </Link>
            </span>
          </label>
          {errors.terms_accepted ? (
            <span className="login-form__error">{errors.terms_accepted}</span>
          ) : null}
        </div>

        <div className="login-form__actions login-form__actions--compact">
          <button
            type="submit"
            className="login-form__submit"
            disabled={isSubmitting || !form.terms_accepted}
          >
            {isSubmitting ? "Creando..." : "Crear cuenta"}
          </button>

          <Link to="/login" className="login-form__signup">
            Iniciar sesión
          </Link>
        </div>
      </form>
    </div>
  )
}

function normalizeApiErrors(error) {
  const nextErrors = {}
  const apiErrors = error?.errors || {}

  Object.entries(apiErrors).forEach(([field, messages]) => {
    nextErrors[field] = Array.isArray(messages) ? messages[0] : String(messages)
  })

  if (!Object.keys(nextErrors).length) {
    nextErrors.general = error?.message || "No fue posible crear tu cuenta."
  }

  return nextErrors
}

export default RegisterForm
