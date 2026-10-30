package com.bantads.msconta.dto;

import org.springframework.hateoas.RepresentationModel;

public class MensagemResponse extends RepresentationModel<MensagemResponse> {

    private String message;

    public MensagemResponse() {
    }

    public MensagemResponse(String message) {
        this.message = message;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
