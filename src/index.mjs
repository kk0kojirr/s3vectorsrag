// Bedrock・S3Vectors・LangChainを使ったTechDoc質問応答Lambda

import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { S3VectorsClient, QueryVectorsCommand } from "@aws-sdk/client-s3vectors";
import { BedrockEmbeddings } from "@langchain/aws";
import { ChatBedrockConverse } from "@langchain/aws";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// Bedrockクライアント初期化
const bedrockClient = new BedrockRuntimeClient({ region: "us-east-1" });

// 環境変数からバケット名・インデックス名を取得
const VECTOR_BUCKET_NAME = process.env.VECTOR_BUCKET_NAME;
const VECTOR_INDEX_NAME = process.env.VECTOR_INDEX_NAME;

export const handler = async (event) => {
  // リクエストボディから質問を取得
  const request = JSON.parse(event.body);
  const question = request.question;

  // 質問文をベクトル化
  const embeddingModel = new BedrockEmbeddings({
    client: bedrockClient,
    model: "amazon.titan-embed-text-v2:0",
  });
  const embedding = await embeddingModel.embedQuery(question);

  // S3Vectorsで類似ドキュメント検索
  const s3vectorsClient = new S3VectorsClient({ region: "us-east-1" });
  const queryCommand = new QueryVectorsCommand({
    vectorBucketName: VECTOR_BUCKET_NAME,
    indexName: VECTOR_INDEX_NAME,
    queryVector: {
      float32: embedding,
    },
    topK: 3,
    returnMetadata: true,
    returnDistance: true,
  });
  const response = await s3vectorsClient.send(queryCommand);

  // 検索結果をJSON形式で整形
  const docsJson = JSON.stringify(
    response.vectors.map(vector => ({ text: vector.metadata.text })),
    null,
    2
  );

  // プロンプトメッセージ作成
  const messages = [
    new SystemMessage(
      "あなたはTechDocに関する質問に回答するチャットボットです。\n" +
      "参考となるドキュメントに記載されている内容に基づいて回答を生成してください"
    ),
    new HumanMessage(`# 参考ドキュメント\n${docsJson}\n# 質問\n${question}`),
  ];

  // Bedrock Claudeモデルで回答生成
  const model = new ChatBedrockConverse({
    client: bedrockClient,
    model: "us.anthropic.claude-sonnet-4-20250514-v1:0",
  });
  const modelResponse = await model.invoke(messages);
  const answer = modelResponse.content;

  // レスポンス返却
  return {
    statusCode: 200,
    body: JSON.stringify({ answer }, null, 2),
  };
};
