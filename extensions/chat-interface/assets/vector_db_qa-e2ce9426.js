import{P as a,C as m,S as h,H as l,L as p,d as c}from"./createElements-7cc41402.js";import{StuffDocumentsChain as b}from"./combine_docs_chain-e60f8786.js";/* empty css                */class d{async getPromptAsync(e,t){return this.getPrompt(e).partial((t==null?void 0:t.partialVariables)??{})}}class f extends d{constructor(e,t=[]){super(),Object.defineProperty(this,"defaultPrompt",{enumerable:!0,configurable:!0,writable:!0,value:void 0}),Object.defineProperty(this,"conditionals",{enumerable:!0,configurable:!0,writable:!0,value:void 0}),this.defaultPrompt=e,this.conditionals=t}getPrompt(e){for(const[t,o]of this.conditionals)if(t(e))return o;return this.defaultPrompt}}function y(n){return n._modelType()==="base_chat_model"}const w=new a({template:`Use the following pieces of context to answer the question at the end. If you don't know the answer, just say that you don't know, don't try to make up an answer.

{context}

Question: {question}
Helpful Answer:`,inputVariables:["context","question"]}),P=`Use the following pieces of context to answer the users question. 
If you don't know the answer, just say that you don't know, don't try to make up an answer.
----------------
{context}`,C=[h.fromTemplate(P),l.fromTemplate("{question}")],_=m.fromMessages(C),D=new f(w,[[y,_]]);function v(n,e={}){const{prompt:t=D.getPrompt(n),verbose:o}=e,r=new p({prompt:t,llm:n,verbose:o});return new b({llmChain:r,verbose:o})}class u extends c{static lc_name(){return"VectorDBQAChain"}get inputKeys(){return[this.inputKey]}get outputKeys(){return this.combineDocumentsChain.outputKeys.concat(this.returnSourceDocuments?["sourceDocuments"]:[])}constructor(e){super(e),Object.defineProperty(this,"k",{enumerable:!0,configurable:!0,writable:!0,value:4}),Object.defineProperty(this,"inputKey",{enumerable:!0,configurable:!0,writable:!0,value:"query"}),Object.defineProperty(this,"vectorstore",{enumerable:!0,configurable:!0,writable:!0,value:void 0}),Object.defineProperty(this,"combineDocumentsChain",{enumerable:!0,configurable:!0,writable:!0,value:void 0}),Object.defineProperty(this,"returnSourceDocuments",{enumerable:!0,configurable:!0,writable:!0,value:!1}),this.vectorstore=e.vectorstore,this.combineDocumentsChain=e.combineDocumentsChain,this.inputKey=e.inputKey??this.inputKey,this.k=e.k??this.k,this.returnSourceDocuments=e.returnSourceDocuments??this.returnSourceDocuments}async _call(e,t){if(!(this.inputKey in e))throw new Error(`Question key ${this.inputKey} not found.`);const o=e[this.inputKey],r=await this.vectorstore.similaritySearch(o,this.k,e.filter,t==null?void 0:t.getChild("vectorstore")),i={question:o,input_documents:r},s=await this.combineDocumentsChain.call(i,t==null?void 0:t.getChild("combine_documents"));return this.returnSourceDocuments?{...s,sourceDocuments:r}:s}_chainType(){return"vector_db_qa"}static async deserialize(e,t){if(!("vectorstore"in t))throw new Error("Need to pass in a vectorstore to deserialize VectorDBQAChain");const{vectorstore:o}=t;if(!e.combine_documents_chain)throw new Error("VectorDBQAChain must have combine_documents_chain in serialized data");return new u({combineDocumentsChain:await c.deserialize(e.combine_documents_chain),k:e.k,vectorstore:o})}serialize(){return{_type:this._chainType(),combine_documents_chain:this.combineDocumentsChain.serialize(),k:this.k}}static fromLLM(e,t,o){const r=v(e);return new this({vectorstore:t,combineDocumentsChain:r,...o})}}export{u as VectorDBQAChain};