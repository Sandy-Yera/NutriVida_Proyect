package cl.duoc.nutrivida.clinica.service;

import static cl.duoc.nutrivida.clinica.service.ServicioService.exigirValido;

import cl.duoc.nutrivida.clinica.dto.ContactoRespuesta;
import cl.duoc.nutrivida.clinica.dto.ContactoSolicitud;
import cl.duoc.nutrivida.clinica.exception.ApiException;
import cl.duoc.nutrivida.clinica.model.Contacto;
import cl.duoc.nutrivida.clinica.repository.ContactoRepository;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Mensajes del formulario de contacto (RF-CLI-05). El correo se guarda en minúsculas, como en EP2. */
@Service
public class ContactoService {

    private final ContactoRepository contactos;
    private final Correlativos correlativos;
    private final Clock reloj;

    public ContactoService(ContactoRepository contactos, Correlativos correlativos, Clock reloj) {
        this.contactos = contactos;
        this.correlativos = correlativos;
        this.reloj = reloj;
    }

    @Transactional
    public ContactoRespuesta registrar(ContactoSolicitud d) {
        exigirValido(ReglasClinica.validarContacto(d));
        Contacto c = new Contacto(correlativos.siguiente(Correlativos.CONTACTO, "CT", 3),
                d.nombre().trim(), d.correo().trim().toLowerCase(), ReglasClinica.telefono(d.telefono()),
                d.motivo(), d.mensaje().trim(), LocalDate.now(reloj));
        return ContactoRespuesta.de(contactos.save(c));
    }

    @Transactional(readOnly = true)
    public List<ContactoRespuesta> listar() {
        return contactos.findAllByOrderByIdAsc().stream().map(ContactoRespuesta::de).toList();
    }

    /** Borrar un mensaje ya atendido no afecta a ningún otro dato. */
    @Transactional
    public void eliminar(String id) {
        if (!contactos.existsById(id)) throw ApiException.noEncontrado("El mensaje no existe.");
        contactos.deleteById(id);
    }
}
