import React from 'react';
import BackButton from '../../components/common/BackButton';

const DeleteAccountPage = () => {
  return (
    <div style={{ padding: '40px', maxWidth: '800px', margin: 'auto' }}>
      <BackButton className="mb-3" />
      <h1>Eliminazione dell'Account TableTalk</h1>
      <p>
        Puoi eliminare il tuo account e tutti i dati associati in qualsiasi momento
        direttamente dall'applicazione.
      </p>
      <h3>Istruzioni:</h3>
      <ol>
        <li>Apri l'app TableTalk e accedi al tuo account.</li>
        <li>Vai alla sezione <strong>"Impostazioni"</strong> del tuo profilo.</li>
        <li>Scorri fino in fondo e tocca il pulsante <strong>"Elimina Account"</strong>.</li>
        <li>Segui le istruzioni a schermo per confermare la tua identità e la tua scelta.</li>
      </ol>
      <p>
        <strong>Attenzione:</strong> L'eliminazione dell'account è un'azione irreversibile e
        comporterà la cancellazione di tutti i tuoi dati, inclusi profilo, chat e pasti.
      </p>
      <hr />
      <p>
        Se riscontri problemi o non riesci più ad accedere al tuo account, per favore
        contattaci all'indirizzo <strong>infotabletalk.app@gmail.com</strong> per ricevere assistenza.
      </p>
    </div>
  );
};

export default DeleteAccountPage;