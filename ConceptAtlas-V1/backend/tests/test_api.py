"""API contract tests; external providers are mocked, no key is needed."""
import importlib
import unittest
from unittest.mock import AsyncMock, patch
import httpx

api = importlib.import_module('backend.app')

def payload():
    return {'request_id':'test-1','question':'Explain this step.','focus':'math','snapshot':{
        'iteration':1,'w':0.6,'loss':5.76,'gradient':-4.8,
        'previous_w':0,'previous_loss':9,'applied_gradient':-6,
        'step_rate':0.1,'next_rate':0.8,'mode':'free'}}

class ApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.client=httpx.AsyncClient(transport=httpx.ASGITransport(app=api.app),base_url='http://test')
    async def asyncTearDown(self):
        await self.client.aclose()
    async def test_health_does_not_expose_credentials(self):
        with patch.object(api,'API_KEY','test-private-key'),patch.object(api,'MODEL','test-model'):
            r=await self.client.get('/api/health')
        self.assertEqual(r.status_code,200)
        self.assertTrue(r.json()['configured'])
        self.assertNotIn('test-private-key',r.text)
    async def test_unconfigured_explanations_are_explicit(self):
        with patch.object(api,'API_KEY',''):
            r=await self.client.post('/api/explain',json=payload())
        self.assertEqual(r.status_code,503)
        self.assertIn('built-in guide',r.json()['detail'])
    async def test_inconsistent_calculation_is_rejected_before_provider(self):
        data=payload(); data['snapshot']['gradient']=-6
        with patch.object(api,'call_llm',new_callable=AsyncMock) as provider:
            r=await self.client.post('/api/explain',json=data)
            provider.assert_not_called()
        self.assertEqual(r.status_code,422)
    async def test_inconsistent_previous_update_is_rejected(self):
        data=payload(); data['snapshot']['step_rate']=0.8
        r=await self.client.post('/api/explain',json=data)
        self.assertEqual(r.status_code,422)
    async def test_initial_state_requires_no_previous_step(self):
        data=payload(); data['snapshot']['iteration']=0
        r=await self.client.post('/api/explain',json=data)
        self.assertEqual(r.status_code,422)
    async def test_response_preserves_request_identity_and_both_rates(self):
        with patch.object(api,'API_KEY','test-key'),patch.object(api,'MODEL','test-model'),patch.object(api,'call_llm',new_callable=AsyncMock,return_value='One computed update.') as provider:
            r=await self.client.post('/api/explain',json=payload())
            sent=provider.call_args.args[0]
        self.assertEqual(r.status_code,200)
        self.assertEqual(r.json(),{'request_id':'test-1','explanation':'One computed update.','source':'llm'})
        self.assertEqual(sent.snapshot.step_rate,.1)
        self.assertEqual(sent.snapshot.next_rate,.8)
    async def test_timeout_is_reported_without_provider_details(self):
        with patch.object(api,'API_KEY','test-key'),patch.object(api,'MODEL','test-model'),patch.object(api,'call_llm',new_callable=AsyncMock,side_effect=httpx.ReadTimeout('private provider detail')):
            r=await self.client.post('/api/explain',json=payload())
        self.assertEqual(r.status_code,504)
        self.assertNotIn('private provider detail',r.text)
    async def test_unknown_api_route_is_not_the_frontend(self):
        r=await self.client.get('/api/unknown')
        self.assertEqual(r.status_code,404)
        self.assertIn('application/json',r.headers['content-type'])
    async def test_prebuilt_frontend_is_served(self):
        r=await self.client.get('/')
        self.assertEqual(r.status_code,200)
        self.assertIn('ConceptAtlas',r.text)

if __name__=='__main__':
    unittest.main()
