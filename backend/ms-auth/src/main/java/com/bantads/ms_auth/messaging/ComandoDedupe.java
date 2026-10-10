package com.bantads.ms_auth.messaging;

import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.stereotype.Component;

@Component
public class ComandoDedupe {
    private static final String COLECAO = "comandos_processados";

    private final MongoTemplate mongo;

    public ComandoDedupe(MongoTemplate mongo) { this.mongo = mongo; }

    public boolean jaProcessado(String sagaId, String tipo) {
        return mongo.exists(Query.query(Criteria.where("_id").is(sagaId + ":" + tipo)), COLECAO);
    }

    public void registrar(String sagaId, String tipo) {
        mongo.save(new Document("_id", sagaId + ":" + tipo), COLECAO);
    }
}
