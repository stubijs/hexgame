<script setup lang="ts">
const route = useRoute()

const query = gql`
query getHexgame($pageId: String!) {
  Hexgame(limit: 1, filter: {project: {_eq: $pageId}, status: {_eq: "published"}}){
    project marker(filter: {status: {_eq: "published"}}){
      title
      content
    }
  }
}
`
const variables = { pageId: route.params.id }

const { data } = await useAsyncQuery(query, variables)

let gameData = []
if (data._rawValue) { gameData = data._rawValue.Hexgame[0].marker } else { gameData = [] }
</script>

<template>
  <LazyHexGame :hex-data="gameData" />
</template>
