<script setup lang="ts">
import defaultHexgame from '@/data/default_hexgame.json'
const route = useRoute()

const query = gql`
query getHexgame($pageId: String!) {
  Hexgame(limit: 1, filter: {project: {_eq: $pageId}, status: {_eq: "published"}}){
    project marker(filter: {status: {_eq: "published"}}){
      title
      content
      image
    }
  }
}
`
const variables = { pageId: route.params.id }

const { data } = await useAsyncQuery(query, variables)

let gameData: { title: string; content: string }[] = []
if (data._rawValue) { gameData = data._rawValue.Hexgame[0].marker } else { gameData = defaultHexgame }
</script>

<template>
  <LazyHexGame :hex-data="gameData" />
</template>
