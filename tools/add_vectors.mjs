import fs from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import { BedrockRuntimeClient } from "@aws-sdk/client-bedrock-runtime";
import { S3VectorsClient, PutVectorsCommand } from "@aws-sdk/client-s3vectors";
import { BedrockEmbeddings } from "@langchain/aws";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

const VECTOR_BUCKET_NAME = process.env.VECTOR_BUCKET_NAME;
const VECTOR_INDEX_NAME = process.env.VECTOR_INDEX_NAME;
const title = process.env.WIKI_TITLE_NAME;

async function createIndex() {
  // テキスト読み込み
  const source = await fs.readFile(`assets/${title}.txt`, "utf-8");

  // チャンク分割
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1024,
    chunkOverlap: 256,
  });
  const chunks = (await splitter.splitText(source)).slice(0, 35);

  // Bedrockクライアント・埋め込みモデル初期化
  const bedrockClient = new BedrockRuntimeClient({ region: "us-east-1" });
  const embeddingModel = new BedrockEmbeddings({
    client: bedrockClient,
    model: "amazon.titan-embed-text-v2:0",
  });

  // ベクトル生成
  const vectors = [];
  for (const chunk of chunks) {
    const embedding = await embeddingModel.embedQuery(chunk);
    vectors.push({
      key: uuidv4(),
      data: { float32: embedding },
      metadata: { text: chunk, title },
    });
  }

  // S3Vectorsへ登録
  const s3vectorsClient = new S3VectorsClient({ region: "us-east-1" });
  await s3vectorsClient.send(
    new PutVectorsCommand({
      vectorBucketName: VECTOR_BUCKET_NAME,
      indexName: VECTOR_INDEX_NAME,
      vectors,
    })
  );

  console.log(`● Successfully stored ${vectors.length} vectors`);
}

createIndex();
