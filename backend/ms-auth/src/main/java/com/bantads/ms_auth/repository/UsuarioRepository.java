package com.bantads.ms_auth.repository;

import com.bantads.ms_auth.model.Usuario;
import java.util.Optional;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface UsuarioRepository extends MongoRepository<Usuario, String> {
    Optional<Usuario> findByEmail(String email);
}
