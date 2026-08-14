import { Link } from "react-router-dom"
import { useSettings } from "../../context/SettingsContext"
import "./legalpages.css"

function TermsPage() {
  const { settings, brandName } = useSettings()
  const siteName = brandName || "CloudiShop"
  const contactEmail = settings.email || "hola@cloudi.mx"
  const address = settings.address || "domicilio disponible en los medios oficiales de contacto de Cloudi"

  return (
    <section className="legal-document-page">
      <div className="container-narrow">
        <article className="legal-document">
          <h1>Términos y Condiciones</h1>

          <p>
            Los presentes Términos y Condiciones regulan el acceso, navegación y uso de{" "}
            <strong>{siteName}</strong>, plataforma de comercio electrónico y servicios digitales
            operada por <strong>Grupo Cloudi Software S.A. de C.V.</strong>, conocido comercialmente
            como <strong>Cloudi</strong>, con domicilio para efectos de contacto en{" "}
            <strong>{address}</strong> y correo electrónico <strong>{contactEmail}</strong>.
          </p>

          <p>
            Al acceder al sitio, crear una cuenta, realizar una compra, solicitar soporte, contratar
            servicios, usar integraciones, descargar información o interactuar con cualquier módulo de
            la plataforma, el usuario acepta estos Términos y Condiciones, el{" "}
            <Link to="/aviso-privacidad">Aviso de Privacidad</Link> y las políticas particulares que
            resulten aplicables.
          </p>

          <h2>1. Definiciones</h2>

          <p>
            Para efectos de este documento, “Cloudi” se refiere a Grupo Cloudi Software S.A. de C.V.;
            “CloudiShop” o “plataforma” se refiere al sitio, software, paneles, tienda en línea,
            módulos, integraciones, APIs, automatizaciones y servicios relacionados; “usuario” se
            refiere a cualquier persona que acceda o utilice la plataforma; “cliente” se refiere a
            quien compra productos, contrata servicios o administra una tienda; y “terceros” se refiere
            a proveedores externos como pasarelas de pago, paqueterías, hosting, analítica, mensajería,
            facturación o herramientas conectadas.
          </p>

          <h2>2. Objeto del servicio</h2>

          <p>
            CloudiShop permite publicar, consultar, vender, comprar, administrar y dar seguimiento a
            productos, pedidos, clientes, pagos, promociones, inventarios, canales de venta, reportes,
            configuraciones ecommerce y funcionalidades relacionadas con operación comercial digital.
            La disponibilidad de funciones puede variar según configuración, plan contratado, permisos,
            integraciones activas, mantenimiento, reglas comerciales o necesidades operativas.
          </p>

          <h2>3. Cuentas, accesos y responsabilidades del usuario</h2>

          <p>
            El usuario se obliga a proporcionar información veraz, completa y actualizada, mantener la
            confidencialidad de sus credenciales, usar la plataforma de forma lícita y notificar a
            Cloudi cualquier uso no autorizado, vulneración, error operativo o sospecha de acceso indebido.
            El usuario será responsable de las acciones realizadas desde su cuenta, salvo que demuestre
            uso no autorizado no atribuible a su negligencia.
          </p>

          <p>
            Queda prohibido usar la plataforma para actividades ilícitas, fraudulentas, engañosas,
            discriminatorias, violatorias de derechos de terceros, envío de malware, scraping abusivo,
            ingeniería inversa no autorizada, evasión de controles, alteración de precios, manipulación
            de inventarios, ataques, carga de contenido ilegal o cualquier uso que afecte la seguridad,
            continuidad o reputación de Cloudi, sus clientes, proveedores o usuarios.
          </p>

          <h2>4. Compras, precios, pagos y facturación</h2>

          <p>
            Los precios, promociones, disponibilidad, impuestos, descuentos, costos de envío y condiciones
            comerciales se mostrarán en la plataforma o en la cotización aplicable. CloudiShop podrá
            actualizar precios, existencias y promociones sin previo aviso, respetando las operaciones
            confirmadas conforme a las reglas vigentes al momento de compra, salvo errores evidentes,
            fallas técnicas, fraude, abuso de promociones o imposibilidad material de cumplimiento.
          </p>

          <p>
            Los pagos pueden procesarse mediante proveedores externos. Cloudi no controla por completo
            las autorizaciones bancarias, comisiones, rechazos, contracargos, tiempos de dispersión o
            revisiones antifraude realizadas por dichos proveedores. La facturación, cuando proceda,
            deberá solicitarse con datos fiscales correctos y dentro de los plazos establecidos por la
            legislación y políticas comerciales aplicables.
          </p>

          <h2>5. Envíos, entregas, devoluciones y garantías</h2>

          <p>
            Los tiempos de entrega son estimados y pueden variar por cobertura, paquetería, disponibilidad,
            validación de pago, domicilio, caso fortuito, fuerza mayor o causas ajenas a CloudiShop. El
            usuario deberá proporcionar datos de envío completos y atender las comunicaciones necesarias
            para la entrega.
          </p>

          <p>
            Las devoluciones, cambios, cancelaciones y garantías se sujetarán a la naturaleza del producto
            o servicio, estado del pedido, políticas comerciales vigentes, condiciones del proveedor,
            normativa aplicable y validación correspondiente. Productos digitales, licencias, servicios
            personalizados, desarrollos, configuraciones, consultorías o software activado pueden tener
            restricciones especiales de cancelación o reembolso.
          </p>

          <h2>6. Software, integraciones y servicios digitales</h2>

          <p>
            Cloudi puede ofrecer software, módulos, configuraciones, integraciones, automatizaciones,
            APIs, reportes, paneles, analítica, hosting, soporte técnico, implementación, mantenimiento
            y servicios profesionales. Salvo pacto escrito distinto, el usuario recibe una licencia de
            uso limitada, no exclusiva, revocable, intransferible y condicionada al cumplimiento de estos
            términos, pagos aplicables y políticas técnicas.
          </p>

          <p>
            El usuario reconoce que los sistemas pueden requerir mantenimiento, actualizaciones,
            ventanas de servicio, cambios de versión, ajustes de seguridad o suspensiones temporales.
            Cloudi realizará esfuerzos razonables para mantener la continuidad, pero no garantiza que la
            plataforma esté libre de errores, interrupciones, pérdida de conectividad, incompatibilidades
            con terceros o incidentes fuera de su control.
          </p>

          <h2>7. Contenido, datos e información cargada por usuarios</h2>

          <p>
            El usuario conserva la responsabilidad sobre textos, imágenes, catálogos, precios, marcas,
            productos, bases de datos, promociones, archivos, documentos, imágenes, información fiscal,
            mensajes, notas de pedido o cualquier contenido que cargue o administre en la plataforma.
            El usuario declara contar con derechos, autorizaciones y permisos suficientes para usar dicho
            contenido y se obliga a mantener indemne a Cloudi ante reclamaciones relacionadas.
          </p>

          <h2>8. Propiedad intelectual e industrial</h2>

          <p>
            Cloudi conserva la titularidad o licencias correspondientes sobre el software, código,
            diseño, interfaz, arquitectura, flujos, módulos, documentación, marcas, logotipos, procesos,
            know-how, plantillas, componentes, desarrollos, mejoras, automatizaciones y elementos propios
            de CloudiShop. Ninguna disposición de estos términos transfiere derechos de propiedad
            intelectual al usuario, salvo autorización expresa y por escrito.
          </p>

          <p>
            Queda prohibido copiar, modificar, vender, sublicenciar, distribuir, explotar, descompilar,
            realizar ingeniería inversa o crear obras derivadas del software o plataforma, excepto cuando
            exista autorización expresa de Cloudi o permiso legal aplicable.
          </p>

          <h2>9. Privacidad, datos personales y seguridad</h2>

          <p>
            El tratamiento de datos personales se regula por el{" "}
            <Link to="/aviso-privacidad">Aviso de Privacidad</Link>. El usuario acepta que Cloudi pueda
            tratar datos necesarios para operar compras, cuentas, soporte, analítica, seguridad,
            facturación, pagos, envíos, notificaciones, prevención de fraude y mejora del servicio.
          </p>

          <p>
            Cuando el cliente administre datos personales de terceros dentro de CloudiShop, será
            responsable de contar con avisos, consentimientos, bases legales y autorizaciones aplicables,
            así como de instruir a Cloudi únicamente tratamientos lícitos y necesarios para la prestación
            del servicio.
          </p>

          <h2>10. Terceros, enlaces e integraciones externas</h2>

          <p>
            La plataforma puede conectarse con servicios externos de pago, envío, facturación, mapas,
            WhatsApp, correo, redes sociales, analítica, almacenamiento, autenticación u otros proveedores.
            Cloudi no será responsable por fallas, cambios, cargos, suspensión, indisponibilidad,
            políticas, contenidos o decisiones de terceros que estén fuera de su control.
          </p>

          <h2>11. Limitación de responsabilidad</h2>

          <p>
            En la medida permitida por la legislación aplicable, Cloudi no será responsable por daños
            indirectos, lucro cesante, pérdida de datos no atribuible a dolo o negligencia grave,
            interrupciones de terceros, errores derivados de información proporcionada por el usuario,
            uso indebido de cuentas, incompatibilidades, decisiones comerciales del usuario, ataques,
            caso fortuito, fuerza mayor o eventos fuera de control razonable.
          </p>

          <h2>12. Suspensión o terminación</h2>

          <p>
            Cloudi podrá suspender o limitar el acceso a cuentas, pedidos, módulos o servicios cuando
            detecte incumplimiento de estos términos, riesgo de seguridad, fraude, pagos vencidos, uso
            abusivo, requerimiento de autoridad, afectación a terceros o necesidad técnica justificada.
            Cuando sea razonablemente posible, se notificará al usuario por los medios registrados.
          </p>

          <h2>13. Modificaciones</h2>

          <p>
            Cloudi podrá actualizar estos Términos y Condiciones para reflejar cambios legales, técnicos,
            comerciales, operativos o de seguridad. La versión vigente estará disponible en este sitio.
            El uso posterior de la plataforma implicará aceptación de los cambios, salvo que la ley exija
            un mecanismo distinto.
          </p>

          <h2>14. Legislación y jurisdicción</h2>

          <p>
            Estos Términos y Condiciones se rigen por las leyes aplicables de los Estados Unidos Mexicanos.
            Cualquier controversia será atendida preferentemente mediante comunicación directa y de buena
            fe entre las partes. Si no fuera posible resolverla, las partes se someterán a las autoridades
            y tribunales competentes conforme a la legislación mexicana aplicable, salvo disposición legal
            imperativa en contrario.
          </p>

          <p>
            Fecha de última actualización: <strong>22 de junio de 2026</strong>.
          </p>
        </article>
      </div>
    </section>
  )
}

export default TermsPage
