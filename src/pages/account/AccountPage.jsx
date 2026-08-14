import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLoading } from "../../context/LoadingContext";
import {
  notifySuccess,
  notifyError,
  notifyWarning,
  notifyInfo,
} from "../../utils/toast";
import "./account.css";

const userMock = {
  id: 27,
  customerNumber: "CLI-000027",
  name: "Cliente Demo",
  email: "cliente.com",
  company: "Tienda de negocio",
};

const initialAddresses = [
  {
    id: 1,
    title: "Sucursal Matriz",
    type: "Fiscal",
    receiver: "Cliente Demo",
    phone: "33 1234 5678",
    address:
      "Av. Vallarta 2450, Col. Arcos Vallarta, Guadalajara, Jalisco, CP 44130",
    isDefault: true,
  },
  {
    id: 2,
    title: "Bodega Norte",
    type: "Entrega",
    receiver: "Cliente Demo",
    phone: "33 8888 2244",
    address:
      "Calle Industria 180, Parque Industrial Norte, Zapopan, Jalisco, CP 45130",
    isDefault: false,
  },
  {
    id: 3,
    title: "Sucursal Centro",
    type: "Entrega",
    receiver: "Cliente Demo",
    phone: "33 4567 8901",
    address:
      "Av. Juárez 1020, Col. Centro, Guadalajara, Jalisco, CP 44100",
    isDefault: false,
  },
];

const sectionCards = [
  {
    id: "profile",
    title: "Mis datos",
    description:
      "Consulta tu información de cuenta, correo, empresa y actualiza tu contraseña.",
    badge: "Cuenta",
  },
  {
    id: "addresses",
    title: "Direcciones",
    description:
      "Revisa tus domicilios registrados, identifica tu principal y consulta tus datos de entrega.",
    badge: "Entrega",
  },
  {
    id: "credit",
    title: "Crédito",
    description:
      "Consulta información de tu línea de crédito, saldo y movimientos cuando esté disponible.",
    badge: "Próximamente",
  },
];

function AccountPage() {
  const { withLoading } = useLoading();

  const [activeSection, setActiveSection] = useState("profile");
  const [user] = useState(userMock);
  const [addresses] = useState(initialAddresses);

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const defaultAddress = useMemo(() => {
    return addresses.find((item) => item.isDefault) || null;
  }, [addresses]);

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const handlePasswordChange = (field, value) => {
    setPasswordForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmitPassword = async () => {
    const currentPassword = passwordForm.currentPassword.trim();
    const newPassword = passwordForm.newPassword.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();

    if (!currentPassword || !newPassword || !confirmPassword) {
      notifyError("Completa todos los campos para cambiar la contraseña");
      return;
    }

    if (newPassword.length < 8) {
      notifyWarning("La nueva contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (newPassword !== confirmPassword) {
      notifyError("La confirmación de contraseña no coincide");
      return;
    }

    if (currentPassword === newPassword) {
      notifyWarning("La nueva contraseña debe ser diferente a la anterior");
      return;
    }

    try {
      await withLoading(async () => {
        await sleep(1200);
        console.log("Cambio de contraseña:", passwordForm);
      }, "Actualizando contraseña...");

      notifySuccess("Contraseña actualizada correctamente");

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordModal(false);
    } catch {
      notifyError("No se pudo actualizar la contraseña");
    }
  };

  const handleComingSoon = () => {
    notifyInfo("Esta sección quedará disponible próximamente");
  };

  const renderSectionContent = () => {
    if (activeSection === "profile") {
      return (
        <section className="account_module_card">
          <div className="account_module_head">
            <div>
              <h2 className="account_module_title">Datos del usuario</h2>
              <p className="account_module_text">
                Consulta la información principal de tu cuenta. Por ahora solo
                podrás actualizar tu contraseña.
              </p>
            </div>

            <button
              type="button"
              className="btn btn_primary"
              onClick={() => setShowPasswordModal(true)}
            >
              Cambiar contraseña
            </button>
          </div>

          <div className="account_info_grid">
            <div className="account_info_item">
              <span className="account_info_label">Nombre</span>
              <strong className="account_info_value">{user.name}</strong>
            </div>

            <div className="account_info_item">
              <span className="account_info_label">Correo electrónico</span>
              <strong className="account_info_value">{user.email}</strong>
            </div>

            <div className="account_info_item">
              <span className="account_info_label">Número de cliente</span>
              <strong className="account_info_value">
                {user.customerNumber}
              </strong>
            </div>

            <div className="account_info_item">
              <span className="account_info_label">Empresa</span>
              <strong className="account_info_value">{user.company}</strong>
            </div>
          </div>

          <div className="account_notice_box">
            <p>
              <strong>Importante:</strong> los datos generales de cuenta estarán
              disponibles para edición cuando se conecte el backend. Por ahora,
              únicamente se deja lista la actualización de contraseña.
            </p>
          </div>
        </section>
      );
    }

    if (activeSection === "addresses") {
      return (
        <section className="account_module_card">
          <div className="account_module_head">
            <div>
              <h2 className="account_module_title">Direcciones</h2>
              <p className="account_module_text">
                Aquí podrás consultar tus domicilios registrados y reconocer tu
                dirección principal.
              </p>
            </div>

            <button
              type="button"
              className="btn btn_secondary"
              onClick={() =>
                notifyInfo("Más adelante aquí abriremos el alta de domicilios")
              }
            >
              Agregar dirección
            </button>
          </div>

          {defaultAddress ? (
            <div className="account_default_address">
              <span className="account_default_badge">Principal</span>
              <div>
                <h3 className="account_default_title">{defaultAddress.title}</h3>
                <p className="account_default_text">
                  {defaultAddress.receiver} · {defaultAddress.phone}
                </p>
                <p className="account_default_text">{defaultAddress.address}</p>
              </div>
            </div>
          ) : null}

          <div className="account_addresses_grid">
            {addresses.map((address) => (
              <article className="account_address_card" key={address.id}>
                <div className="account_address_top">
                  <div>
                    <h3 className="account_address_title">{address.title}</h3>
                    <p className="account_address_type">{address.type}</p>
                  </div>

                  {address.isDefault ? (
                    <span className="account_badge">Principal</span>
                  ) : (
                    <span className="account_badge account_badge_soft">
                      Secundaria
                    </span>
                  )}
                </div>

                <div className="account_address_body">
                  <p className="account_address_meta">
                    <strong>Recibe:</strong> {address.receiver}
                  </p>
                  <p className="account_address_meta">
                    <strong>Teléfono:</strong> {address.phone}
                  </p>
                  <p className="account_address_description">
                    {address.address}
                  </p>
                </div>

                <div className="account_address_actions">
                  <button
                    type="button"
                    className="btn btn_ghost"
                    onClick={() =>
                      notifyInfo("Más adelante aquí verás el detalle del domicilio")
                    }
                  >
                    Ver detalle
                  </button>

                  <button
                    type="button"
                    className="btn btn_secondary"
                    onClick={() =>
                      notifyInfo("Más adelante aquí podrás editar la dirección")
                    }
                  >
                    Editar
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      );
    }

    if (activeSection === "credit") {
      return (
        <section className="account_module_card">
          <div className="account_module_head">
            <div>
              <h2 className="account_module_title">Crédito</h2>
              <p className="account_module_text">
                Esta sección quedará preparada para mostrar línea de crédito,
                saldo disponible, días de pago y movimientos.
              </p>
            </div>
          </div>

          <div className="account_coming_box">
            <div className="account_coming_icon">%</div>
            <h3>Próximamente</h3>
            <p>
              Aquí integraremos la información de crédito del cliente cuando la
              parte operativa y backend estén listas.
            </p>

            <button
              type="button"
              className="btn btn_primary"
              onClick={handleComingSoon}
            >
              Entendido
            </button>
          </div>
        </section>
      );
    }

    return null;
  };

  return (
    <div className="account_page">
      <div className="account_shell">
        <header className="account_header">
          <div className="account_header_left">
            <h1 className="account_title">Mi cuenta</h1>
            <p className="account_meta">
              Administra tu información de usuario, direcciones y próximos
              módulos de cuenta.
            </p>
          </div>

          <div className="account_header_right">
            <Link to="/" className="btn btn_ghost btn_link_like">
              Volver al inicio
            </Link>
          </div>
        </header>

        <section className="account_cards_overview">
          {sectionCards.map((card) => (
            <button
              type="button"
              key={card.id}
              className={`account_overview_card ${
                activeSection === card.id ? "is_active" : ""
              }`}
              onClick={() => {
                setActiveSection(card.id);
                setShowMobileMenu(false);
              }}
            >
              <div className="account_overview_top">
                <span className="account_overview_badge">{card.badge}</span>
              </div>

              <div className="account_overview_content">
                <h2 className="account_overview_title">{card.title}</h2>
                <p className="account_overview_text">{card.description}</p>
              </div>
            </button>
          ))}
        </section>

        <div className="account_mobile_switcher">
          <button
            type="button"
            className="account_mobile_switcher_btn"
            onClick={() => setShowMobileMenu((prev) => !prev)}
          >
            Sección actual:{" "}
            <strong>
              {activeSection === "profile"
                ? "Mis datos"
                : activeSection === "addresses"
                ? "Direcciones"
                : "Crédito"}
            </strong>
          </button>

          {showMobileMenu ? (
            <div className="account_mobile_switcher_menu">
              {sectionCards.map((card) => (
                <button
                  type="button"
                  key={card.id}
                  className={`account_mobile_switcher_item ${
                    activeSection === card.id ? "is_active" : ""
                  }`}
                  onClick={() => {
                    setActiveSection(card.id);
                    setShowMobileMenu(false);
                  }}
                >
                  {card.title}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="account_content_layout">
          <aside className="account_sidebar">
            <div className="account_sidebar_card">
              <h3 className="account_sidebar_title">Accesos</h3>

              <div className="account_sidebar_nav">
                <button
                  type="button"
                  className={`account_sidebar_link ${
                    activeSection === "profile" ? "is_active" : ""
                  }`}
                  onClick={() => setActiveSection("profile")}
                >
                  Mis datos
                </button>

                <button
                  type="button"
                  className={`account_sidebar_link ${
                    activeSection === "addresses" ? "is_active" : ""
                  }`}
                  onClick={() => setActiveSection("addresses")}
                >
                  Direcciones
                </button>

                <button
                  type="button"
                  className={`account_sidebar_link ${
                    activeSection === "credit" ? "is_active" : ""
                  }`}
                  onClick={() => setActiveSection("credit")}
                >
                  Crédito
                </button>
              </div>

              <div className="account_sidebar_summary">
                <p>
                  <strong>Cliente:</strong> {user.name}
                </p>
                <p>
                  <strong>No. cliente:</strong> {user.customerNumber}
                </p>
                <p>
                  <strong>Empresa:</strong> {user.company}
                </p>
              </div>
            </div>
          </aside>

          <main className="account_main">{renderSectionContent()}</main>
        </div>
      </div>

      {showPasswordModal ? (
        <div
          className="account_modal_overlay"
          onClick={() => setShowPasswordModal(false)}
        >
          <div
            className="account_modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="account_modal_header">
              <h3>Cambiar contraseña</h3>

              <button
                type="button"
                className="account_modal_close"
                onClick={() => setShowPasswordModal(false)}
              >
                ×
              </button>
            </div>

            <div className="account_modal_body">
              <p className="account_modal_text">
                Ingresa tu contraseña actual y define una nueva contraseña para
                tu cuenta.
              </p>

              <div className="account_form_grid">
                <div className="form_field form_field_full">
                  <label>Contraseña actual</label>
                  <input
                    type="password"
                    placeholder="Ingresa tu contraseña actual"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      handlePasswordChange("currentPassword", e.target.value)
                    }
                  />
                </div>

                <div className="form_field form_field_full">
                  <label>Nueva contraseña</label>
                  <input
                    type="password"
                    placeholder="Ingresa la nueva contraseña"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      handlePasswordChange("newPassword", e.target.value)
                    }
                  />
                </div>

                <div className="form_field form_field_full">
                  <label>Confirmar nueva contraseña</label>
                  <input
                    type="password"
                    placeholder="Confirma la nueva contraseña"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      handlePasswordChange("confirmPassword", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="account_modal_actions">
                <button
                  type="button"
                  className="btn btn_secondary"
                  onClick={() => setShowPasswordModal(false)}
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  className="btn btn_primary"
                  onClick={handleSubmitPassword}
                >
                  Guardar contraseña
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default AccountPage;
