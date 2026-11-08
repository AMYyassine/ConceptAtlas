"""Contract tests for actual generation endpoints using a mocked AI transport."""
import copy
import importlib
import unittest
from unittest.mock import AsyncMock, patch
import httpx
from pydantic import ValidationError
api=importlib.import_module('backend.app')
learning=importlib.import_module('backend.learning_api')

def dimensions():
    return [{'id':'perspective','name':'Perspective','description':'How to understand it.','values':['Visual','Mathematical']},{'id':'depth','name':'Depth','description':'How far to go.','values':['Foundation','Advanced']}]

def card(i=0):
    return {'id':f'card-{i}','title':f'Explanation {i}','keywords':['slope','direction'],'summary':'Connect a slope to a direction.','body':'A negative gradient makes the updated parameter larger. Use the equation to connect the sign to the graph.','attributes':{'perspective':'Visual','depth':'Foundation'},'representation':'visual'}

class LearningApiTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.client=httpx.AsyncClient(transport=httpx.ASGITransport(app=api.app),base_url='http://test')
    async def asyncTearDown(self):await self.client.aclose()
    async def test_generation_without_credentials_has_no_fake_fallback(self):
        with patch.object(api,'API_KEY',''):
            r=await self.client.post('/api/dimensions',json={'prompt':'Explain Bayes theorem.'})
        self.assertEqual(r.status_code,503);self.assertNotIn('dimensions',r.json())
    async def test_prompt_to_dimensions_contract(self):
        plan=learning.DimensionResult(title='Gradient descent',description='Connected explanations.',module='gradient_descent',dimensions=dimensions())
        with patch.object(learning,'request_json',new_callable=AsyncMock,return_value=plan) as provider:
            r=await self.client.post('/api/dimensions',json={'prompt':'Help me understand gradient descent.'})
            self.assertIn('Help me understand',provider.call_args.args[2])
        self.assertEqual(r.status_code,200);self.assertEqual(r.json()['dimensions'][0]['name'],'Perspective')
    async def test_unrelated_topic_does_not_get_fixed_gradient_simulator(self):
        plan=learning.DimensionResult(title='Bayes',description='Probability.',module='gradient_descent',dimensions=dimensions())
        with patch.object(learning,'request_json',new_callable=AsyncMock,return_value=plan):
            r=await self.client.post('/api/dimensions',json={'prompt':'Explain Bayes theorem.'})
        self.assertEqual(r.json()['module'],'none')
    async def test_dimension_guided_cards_are_validated_and_get_unique_ids(self):
        result=learning.CardResult(cards=[card(i) for i in range(3)])
        with patch.object(learning,'request_json',new_callable=AsyncMock,return_value=result):
            r=await self.client.post('/api/cards',json={'prompt':'Explain gradient descent.','dimensions':dimensions(),'count':3,'filters':{'perspective':'Visual'}})
        self.assertEqual(r.status_code,200);self.assertEqual(len(set(c['id'] for c in r.json()['cards'])),3)
    async def test_invented_dimension_values_are_rejected(self):
        bad=card();bad['attributes']['perspective']='Unspecified'
        with patch.object(learning,'request_json',new_callable=AsyncMock,return_value=learning.CardResult(cards=[bad,card(1),card(2)])):
            r=await self.client.post('/api/cards',json={'prompt':'Explain gradient descent.','dimensions':dimensions(),'count':3})
        self.assertEqual(r.status_code,502)
    async def test_explicit_filter_must_be_honored(self):
        with patch.object(learning,'request_json',new_callable=AsyncMock,return_value=learning.CardResult(cards=[card(i) for i in range(3)])):
            r=await self.client.post('/api/cards',json={'prompt':'Explain gradient descent.','dimensions':dimensions(),'count':3,'filters':{'perspective':'Mathematical'}})
        self.assertEqual(r.status_code,502)
    async def test_unknown_filter_rejected_before_generation(self):
        with patch.object(learning,'request_json',new_callable=AsyncMock) as provider:
            r=await self.client.post('/api/cards',json={'prompt':'Explain gradient descent.','dimensions':dimensions(),'count':3,'filters':{'missing':'Something'}})
        self.assertEqual(r.status_code,422);provider.assert_not_called()
    async def test_incomplete_generation_is_reported(self):
        with patch.object(learning,'request_json',new_callable=AsyncMock,return_value=learning.CardResult(cards=[card()])):
            r=await self.client.post('/api/cards',json={'prompt':'Explain gradient descent.','dimensions':dimensions(),'count':3})
        self.assertEqual(r.status_code,502)
    async def test_added_dimension_must_classify_every_card(self):
        result=learning.ExtendResult(dimension={'id':'focus','name':'Focus','description':'A new lens.','values':['Direction','Stability']},assignments=[{'card_id':'wrong','value':'Direction'}])
        with patch.object(learning,'request_json',new_callable=AsyncMock,return_value=result):
            r=await self.client.post('/api/extend-dimension',json={'prompt':'Explain gradient descent.','name':'Focus','dimensions':dimensions(),'cards':[card()]})
        self.assertEqual(r.status_code,502)
    async def test_tutor_does_not_return_invented_navigation_targets(self):
        with patch.object(learning,'request_json',new_callable=AsyncMock,return_value=learning.TutorResult(message='Try another perspective.',suggested_card_id='invented')):
            r=await self.client.post('/api/tutor',json={'prompt':'Gradient descent','question':'I feel lost.','selected_card':card(),'candidates':[{'id':'card-0','title':'A graph'}]})
        self.assertEqual(r.status_code,200);self.assertIsNone(r.json()['suggested_card_id'])
    async def test_settings_never_return_the_key(self):
        with patch.object(api,'API_KEY',''),patch.object(api,'API_BASE','https://example.test/v1'),patch.object(api,'MODEL',''):
            r=await self.client.post('/api/settings',json={'base_url':'https://example.test/v1','model':'test-model','api_key':'private-test-key'})
            self.assertEqual(r.status_code,200);self.assertNotIn('private-test-key',r.text)
            r=await self.client.get('/api/settings');self.assertNotIn('private-test-key',r.text);self.assertTrue(r.json()['has_key'])
    async def test_json_adapter_calls_chat_endpoint_and_parses_validated_output(self):
        plan={'title':'A concept','description':'Learn it.','module':'none','dimensions':dimensions()}
        response=httpx.Response(200,json={'choices':[{'message':{'content':__import__('json').dumps(plan)}}]},request=httpx.Request('POST','https://example.test/v1/chat/completions'))
        fake=AsyncMock();fake.post.return_value=response
        context=AsyncMock();context.__aenter__.return_value=fake
        with patch.object(api,'API_KEY','key'),patch.object(api,'MODEL','model'),patch.object(api,'API_BASE','https://example.test/v1'),patch.object(learning.httpx,'AsyncClient',return_value=context):
            result=await learning.request_json(api,'System','Question',learning.DimensionResult)
        self.assertEqual(result.title,'A concept');self.assertEqual(fake.post.call_args.args[0],'https://example.test/v1/chat/completions')
        self.assertEqual(fake.post.call_args.kwargs['json']['response_format'],{'type':'json_object'})
    def test_duplicate_values_rejected(self):
        d=dimensions()[0];d['values']=['Visual','Visual']
        with self.assertRaises(ValidationError):learning.Dimension.model_validate(d)

if __name__=='__main__':unittest.main()
