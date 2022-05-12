import axios from "axios";
/**
 *
 * @param {string=} address
 * @returns
 */
export const getProposals = async (appState, address = "") => {
  try {
    appState.loading.proposals = true;
    const { data } = await axios.post(
      process.env.BASE_API_URI + "/proposals/",
      { address, event_id: process.env.EVENT_ID }
    );
    const {
      status,
      data: { questions },
    } = data;
    if (status === "success") {
      const proposals = {
        active: questions.filter((el) => Boolean(el.is_active)),
        inactive: questions.filter((el) => !el.is_active),
      };
      appState.proposals = proposals;
      return proposals;
    }
  } catch (error) {
    //   handle error case;
  } finally {
    appState.loading.proposals = false;
  }
};

export const getMessageToSign = (selectedProposal, selectedOption) => {
  const option = selectedProposal.options.find((el) => el.key === selectedOption);

  const messageToSign = [{ question_id: selectedProposal.question_id, answer_key: option.key }];

  console.log(
    "JSON.stringify(messageToSign)",
    JSON.stringify(messageToSign),
    JSON.stringify(messageToSign).toString().replace(/\\/g, "")
  );
  const a = JSON.stringify(messageToSign);
  const b = JSON.stringify(messageToSign).toString().replace(/\\/g, "");
  //   JSON.stringify(messageToSign).toString().replace(/\\/g, "")
  return {
    raw: messageToSign,
    string: JSON.stringify(messageToSign).replaceAll(" ", ""),
  };
};

export const saveProposal = async (address, message, signature) => {
  const { data } = await axios.post(
    process.env.BASE_API_URI + "/proposal/save",
    {
      event_id: process.env.EVENT_ID,
      message,
      address,
      signature,
    }
  );
  return data;
};

export const closeSelectedProposal = (appState) => {
  appState.selectedProposal = undefined;
  appState.selectedOption = undefined;
  appState.message = undefined;
  appState.signed = undefined;
};
