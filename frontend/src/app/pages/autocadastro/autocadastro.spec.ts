import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Autocadastro } from './autocadastro';

describe('Autocadastro', () => {
  let component: Autocadastro;
  let fixture: ComponentFixture<Autocadastro>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Autocadastro],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()]
    }).compileComponents();

    fixture = TestBed.createComponent(Autocadastro);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('formata CPF completo sem truncar e valida sobre 11 dígitos', () => {
    const control = component.formulario.controls.cpf;
    control.setValue('52998224725');
    component.formatarCpf();
    expect(control.value).toBe('529.982.247-25');
    expect(control.valid).toBe(true);
  });

  it('formata telefone de 11 dígitos e aceita também 10', () => {
    const control = component.formulario.controls.telefone;
    control.setValue('11987654321');
    component.formatarTelefone();
    expect(control.value).toBe('(11) 98765-4321');
    expect(control.valid).toBe(true);
    control.setValue('1132654321');
    component.formatarTelefone();
    expect(control.value).toBe('(11) 3265-4321');
    expect(control.valid).toBe(true);
  });

  it('formata CEP completo sem truncar e consulta ViaCEP somente com 8 dígitos', () => {
    const http = TestBed.inject(HttpTestingController);
    const control = component.formulario.controls.cep;
    control.setValue('01001000');
    component.formatarCep();
    expect(control.value).toBe('01001-000');
    expect(control.valid).toBe(true);
    const request = http.expectOne('https://viacep.com.br/ws/01001000/json/');
    request.flush({ logradouro: 'Praça da Sé', localidade: 'São Paulo', uf: 'SP' });
    expect(component.formulario.controls.logradouro.value).toBe('Praça da Sé');
  });

  it('exibe CEP formatado e envia CEP, CPF e telefone somente com dígitos', () => {
    const http = TestBed.inject(HttpTestingController);
    component.formulario.patchValue({
      nome: 'Maria da Silva', email: 'maria@example.com',
      cpf: '529.982.247-25', telefone: '(11) 98765-4321',
      salario: '2500,00', logradouro: 'Rua A', numero: '12A',
      complemento: '', cep: '74390-858', cidade: 'Goiânia', uf: 'GO'
    });
    expect(component.formulario.controls.cep.value).toBe('74390-858');
    component.solicitarCadastro();

    const request = http.expectOne('http://localhost:3000/clientes');
    expect(request.request.body).toMatchObject({
      cep: '74390858',
      cpf: '52998224725',
      telefone: '11987654321'
    });
    request.flush({ mensagem: 'Solicitação enviada para análise' });
  });

  it('limita colagem e digitação à quantidade máxima de dígitos reais', () => {
    const cpf = component.formulario.controls.cpf;
    cpf.setValue('529.982.247-25999');
    component.formatarCpf();
    expect(cpf.value).toBe('529.982.247-25');
    const cep = component.formulario.controls.cep;
    cep.setValue('01001-000999');
    component.formatarCep();
    expect(cep.value).toBe('01001-000');
  });
});
