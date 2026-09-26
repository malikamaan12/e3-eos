import { useState, useCallback } from 'react';
import { useEosContext } from '../context/EosContext.js';
import { ViewState, ViewStateFactory } from '../view-states.js';
import { ClientPortalProjectView } from '../client-projection.js';

export function useEosApi() {
  const { apiClient: client } = useEosContext();

  const [portfolioState, setPortfolioState] = useState<ViewState>(ViewStateFactory.loading());
  const [clientPortalState, setClientPortalState] = useState<ViewState<ClientPortalProjectView>>(ViewStateFactory.loading());

  const loadPortfolio = useCallback(async () => {
    setPortfolioState(ViewStateFactory.loading('Loading executive portfolio data...'));
    try {
      const data = await client.getPortfolioDashboard();
      setPortfolioState(ViewStateFactory.ready(data));
    } catch {
      setPortfolioState(ViewStateFactory.empty('Unable to load portfolio', 'Please check network connection.'));
    }
  }, [client]);

  const loadClientPortal = useCallback(async (projectId: string) => {
    setClientPortalState(ViewStateFactory.loading('Loading client room...'));
    try {
      const data = await client.getClientPortalProject(projectId);
      setClientPortalState(ViewStateFactory.ready(data));
    } catch {
      setClientPortalState(ViewStateFactory.empty('Unable to load client portal', 'Project not found or access expired.'));
    }
  }, [client]);

  const approveClientDecision = useCallback(async (projectId: string, decisionId: string) => {
    return await client.approveChangeRequest(projectId, decisionId);
  }, [client]);

  return {
    client,
    portfolioState,
    clientPortalState,
    loadPortfolio,
    loadClientPortal,
    approveClientDecision,
  };
}
