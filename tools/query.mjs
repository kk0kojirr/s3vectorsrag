import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { S3VectorsClient, QueryVectorsCommand } from "@aws-sdk/client-s3vectors";
import { BedrockEmbeddings } from "@langchain/aws";

const VECTOR_BUCKET_NAME = process.env.VECTOR_BUCKET_NAME;
const VECTOR_INDEX_NAME = process.env.VECTOR_INDEX_NAME;

async function query(question) {
  // Bedrockクライアント初期化
  const bedrockClient = new BedrockRuntimeClient({ region: "us-east-1" });

  // 質問文をベクトル化
  const embeddingModel = new BedrockEmbeddings({
    client: bedrockClient,
    model: "amazon.titan-embed-text-v2:0",
  });
  const embedding = await embeddingModel.embedQuery(question);

  // S3Vectorsで類似検索
  const s3vectorsClient = new S3VectorsClient({ region: "us-east-1" });
  const queryCommand = new QueryVectorsCommand({
    vectorBucketName: VECTOR_BUCKET_NAME,
    indexName: VECTOR_INDEX_NAME,
    queryVector: { float32: embedding },
    topK: 3,
    returnMetadata: true,
    returnDistance: true,
  });
  const response = await s3vectorsClient.send(queryCommand);

  // 結果を出力
  for (const vector of response.vectors) {
    console.log(vector);
  }
}

// 実行例
query("蘭奢待って何？おいしいの？");
